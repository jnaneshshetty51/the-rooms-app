import prisma from '../index';
import { Prisma, RoomType, GroupBillingType, GroupBookingStatus } from '@prisma/client';

export type CreateGroupBookingData = {
    name: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    billingType?: GroupBillingType;
    checkInDate: Date;
    checkOutDate: Date;
    rooms: {
        roomType: RoomType;
        count: number;
    }[];
    corporateAccountId?: string;
    createdById?: string;
    propertyId?: string;
};

/**
 * Generate a unique group code: GRP-YYYYMMDD-XXX
 */
export async function generateGroupCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `GRP-${dateStr}-`;

    // Find the highest count for today
    const lastGroup = await prisma.groupBooking.findFirst({
        where: { groupCode: { startsWith: prefix } },
        orderBy: { groupCode: 'desc' },
        select: { groupCode: true },
    });

    let counter = 1;
    if (lastGroup) {
        const lastCounter = parseInt(lastGroup.groupCode.split('-').pop() ?? '0', 10);
        counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(3, '0')}`;
}

/**
 * Create a group booking with multiple rooms
 */
export async function createGroupBooking(data: CreateGroupBookingData) {
    const groupCode = await generateGroupCode();
    const propertyId = data.propertyId || 'default';

    return prisma.$transaction(async (tx) => {
        // 1. Create group booking
        const group = await tx.groupBooking.create({
            data: {
                groupCode,
                propertyId,
                name: data.name,
                contactPerson: data.contactPerson,
                contactPhone: data.contactPhone,
                contactEmail: data.contactEmail,
                billingType: data.billingType || 'INDIVIDUAL',
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
                status: 'CONFIRMED',
                createdById: data.createdById,
            },
        });

        const bookings = [];
        const errors = [];

        // 2. Create bookings for each room type
        for (const roomReq of data.rooms) {
            // Find available rooms
            const availableRooms = await tx.room.findMany({
                where: {
                    type: roomReq.roomType,
                    status: 'VACANT',
                    propertyId,
                    bookings: {
                        none: {
                            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                            AND: [
                                { checkIn: { lt: data.checkOutDate } },
                                { checkOut: { gt: data.checkInDate } }
                            ]
                        }
                    }
                },
                take: roomReq.count,
                orderBy: { roomNumber: 'asc' }
            });

            if (availableRooms.length < roomReq.count) {
                errors.push({
                    roomType: roomReq.roomType,
                    requested: roomReq.count,
                    available: availableRooms.length
                });
            }

            // Create booking for each available room
            for (const room of availableRooms) {
                // Create placeholder guest (to be updated later with actual details)
                const guest = await tx.guest.create({
                    data: {
                        name: 'TBD',
                        phone: 'TBD',
                    }
                });

                // Calculate price - we'll use a simplified calculation here
                // In production, you'd call calculateBookingPrice
                const nights = Math.ceil(
                    (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const basePrice = room.basePriceDouble.toNumber();
                const totalAmount = basePrice * nights;

                const bookingNumber = await generateBookingNumberInternal(tx);

                const booking = await tx.booking.create({
                    data: {
                        bookingNumber,
                        guestId: guest.id,
                        roomId: room.id,
                        propertyId,
                        checkIn: data.checkInDate,
                        checkOut: data.checkOutDate,
                        guestsCount: 1,
                        bookingType: 'DAILY',
                        bookingSource: 'GROUP',
                        status: 'CONFIRMED',
                        paymentStatus: 'PENDING',
                        baseAmount: new Prisma.Decimal(basePrice),
                        totalAmount: new Prisma.Decimal(totalAmount),
                        groupBookingId: group.id,
                        corporateAccountId: data.corporateAccountId,
                        createdById: data.createdById,
                    }
                });

                // Create room hold
                await tx.roomHold.create({
                    data: {
                        roomId: room.id,
                        holdType: 'BOOKING',
                        bookingId: booking.id,
                        checkIn: data.checkInDate,
                        checkOut: data.checkOutDate,
                        expiresAt: new Date(data.checkInDate.getTime() - 4 * 60 * 60 * 1000), // 4 hours before check-in
                        status: 'ACTIVE',
                    }
                });

                bookings.push(booking);
            }
        }

        // 3. Create audit log
        await tx.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'group_booking',
                entityId: group.id,
                userId: data.createdById,
                metadata: {
                    groupCode,
                    roomCount: bookings.length,
                    errors: errors.length > 0 ? errors : undefined
                }
            }
        });

        return {
            group,
            bookings,
            errors: errors.length > 0 ? errors : undefined
        };
    });
}

/**
 * Internal helper to generate booking number within transaction
 */
async function generateBookingNumberInternal(tx: Prisma.TransactionClient): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `BKN-${dateStr}-`;

    const lastBooking = await tx.booking.findFirst({
        where: { bookingNumber: { startsWith: prefix } },
        orderBy: { bookingNumber: 'desc' },
        select: { bookingNumber: true },
    });

    let counter = 1;
    if (lastBooking) {
        const lastCounter = parseInt(lastBooking.bookingNumber.split('-').pop() ?? '0', 10);
        counter = lastCounter + 1;
    }

    return `${prefix}${String(counter).padStart(4, '0')}`;
}

/**
 * Get group booking by ID with all bookings
 */
export async function getGroupBooking(id: string) {
    return prisma.groupBooking.findUnique({
        where: { id },
        include: {
            bookings: {
                include: {
                    guest: true,
                    room: true,
                    payments: true,
                },
            },
            createdBy: { select: { id: true, name: true, email: true } },
        },
    });
}

/**
 * Get group booking by group code
 */
export async function getGroupBookingByCode(groupCode: string) {
    return prisma.groupBooking.findUnique({
        where: { groupCode },
        include: {
            bookings: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

/**
 * Add a room to an existing group booking
 */
export async function addRoomToGroup(
    groupId: string,
    roomType: RoomType,
    createdById?: string
) {
    return prisma.$transaction(async (tx) => {
        const group = await tx.groupBooking.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            throw new Error('GROUP_NOT_FOUND');
        }

        // Find an available room
        const availableRoom = await tx.room.findFirst({
            where: {
                type: roomType,
                status: 'VACANT',
                propertyId: group.propertyId,
                bookings: {
                    none: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        AND: [
                            { checkIn: { lt: group.checkOutDate } },
                            { checkOut: { gt: group.checkInDate } }
                        ]
                    }
                }
            },
        });

        if (!availableRoom) {
            throw new Error('NO_ROOM_AVAILABLE');
        }

        // Create placeholder guest
        const guest = await tx.guest.create({
            data: {
                name: 'TBD',
                phone: 'TBD',
            }
        });

        // Calculate price
        const nights = Math.ceil(
            (group.checkOutDate.getTime() - group.checkInDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const basePrice = availableRoom.basePriceDouble.toNumber();
        const totalAmount = basePrice * nights;

        const bookingNumber = await generateBookingNumberInternal(tx);

        // Create booking
        const booking = await tx.booking.create({
            data: {
                bookingNumber,
                guestId: guest.id,
                roomId: availableRoom.id,
                propertyId: group.propertyId,
                checkIn: group.checkInDate,
                checkOut: group.checkOutDate,
                guestsCount: 1,
                bookingType: 'DAILY',
                bookingSource: 'GROUP',
                status: 'CONFIRMED',
                paymentStatus: 'PENDING',
                baseAmount: new Prisma.Decimal(basePrice),
                totalAmount: new Prisma.Decimal(totalAmount),
                groupBookingId: group.id,
                createdById,
            }
        });

        // Create room hold
        await tx.roomHold.create({
            data: {
                roomId: availableRoom.id,
                holdType: 'BOOKING',
                bookingId: booking.id,
                checkIn: group.checkInDate,
                checkOut: group.checkOutDate,
                expiresAt: new Date(group.checkInDate.getTime() - 4 * 60 * 60 * 1000),
                status: 'ACTIVE',
            }
        });

        return booking;
    });
}

/**
 * Remove a room from a group booking
 */
export async function removeRoomFromGroup(bookingId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('BOOKING_NOT_FOUND');
        }

        if (!booking.groupBookingId) {
            throw new Error('BOOKING_NOT_IN_GROUP');
        }

        // Release room hold
        await tx.roomHold.updateMany({
            where: { bookingId, status: 'ACTIVE' },
            data: { status: 'RELEASED', releasedAt: new Date() }
        });

        // Remove from group
        const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { groupBookingId: null }
        });

        return updatedBooking;
    });
}

/**
 * Update group booking status
 */
export async function updateGroupBookingStatus(
    id: string,
    status: GroupBookingStatus
) {
    return prisma.groupBooking.update({
        where: { id },
        data: { status },
    });
}

/**
 * Get all group bookings
 */
export async function getGroupBookings(filters: {
    status?: GroupBookingStatus;
    propertyId?: string;
    page?: number;
    perPage?: number;
} = {}) {
    const {
        status,
        propertyId,
        page = 1,
        perPage = 20,
    } = filters;

    const where: Prisma.GroupBookingWhereInput = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;

    const [groups, total] = await Promise.all([
        prisma.groupBooking.findMany({
            where,
            include: {
                _count: { select: { bookings: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.groupBooking.count({ where }),
    ]);

    return { groups, total, pages: Math.ceil(total / perPage), page };
}
