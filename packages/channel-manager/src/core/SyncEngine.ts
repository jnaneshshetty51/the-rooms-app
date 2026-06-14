// packages/channel-manager/src/core/SyncEngine.ts
// Sync coordination engine

import type { ChannelName, SyncResult, SyncType } from '../types';
import type { InventoryUpdate } from '../types/inventory';
import type { OtaBooking, ImportResult } from '../types/booking';
import { channelRegistry } from './ChannelRegistry';
import { ConflictResolver } from './ConflictResolver';
import { logger, ChildLogger } from '../utils/logger';
// @ts-ignore - workspace dependency
import { db } from '@the-rooms/db';

export interface SyncOptions {
    startDate?: Date;
    endDate?: Date;
    forceOverwrite?: boolean;
}

export class SyncEngine {
    private conflictResolver: ConflictResolver;
    private engineLogger: ChildLogger;

    constructor() {
        this.conflictResolver = new ConflictResolver();
        this.engineLogger = logger.child({ component: 'SyncEngine' });
    }

    async executeFullSync(channelId: string, options: SyncOptions = {}): Promise<SyncResult> {
        const startTime = Date.now();
        this.engineLogger.info('Starting full sync', { channelId });

        try {
            const channel = await db.channel.findUnique({ where: { id: channelId } });
            if (!channel) {
                throw new Error(`Channel not found: ${channelId}`);
            }

            const adapter = channelRegistry.get(channel.name as ChannelName);
            if (!adapter) {
                throw new Error(`Channel adapter not available: ${channel.name}`);
            }

            // Create sync log
            const syncLog = await db.syncLog.create({
                data: {
                    channelId,
                    syncType: 'FULL_INVENTORY',
                    syncDirection: 'OUTBOUND',
                    status: 'IN_PROGRESS',
                    startedAt: new Date(),
                },
            });

            try {
                // Fetch inventory from PMS
                const pmsInventory = await this.fetchPmsInventory(options.startDate, options.endDate);

                // Push to channel
                const result = await adapter.pushInventory(pmsInventory);

                // Update sync log
                await db.syncLog.update({
                    where: { id: syncLog.id },
                    data: {
                        status: result.success ? 'COMPLETED' : 'FAILED',
                        itemsTotal: pmsInventory.length,
                        itemsSynced: result.itemsSynced,
                        itemsFailed: result.itemsFailed,
                        completedAt: new Date(),
                        durationMs: Date.now() - startTime,
                    },
                });

                return result;
            } catch (error) {
                // Update sync log with error
                await db.syncLog.update({
                    where: { id: syncLog.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        completedAt: new Date(),
                        durationMs: Date.now() - startTime,
                    },
                });
                throw error;
            }
        } catch (error) {
            this.engineLogger.error('Full sync failed', error as Error, { channelId });
            throw error;
        }
    }

    async executeIncrementalSync(channelId: string): Promise<SyncResult> {
        const startTime = Date.now();
        this.engineLogger.info('Starting incremental sync', { channelId });

        try {
            const channel = await db.channel.findUnique({ where: { id: channelId } });
            if (!channel) {
                throw new Error(`Channel not found: ${channelId}`);
            }

            const adapter = channelRegistry.get(channel.name as ChannelName);
            if (!adapter) {
                throw new Error(`Channel adapter not available: ${channel.name}`);
            }

            // Get last sync time
            const lastSync = await db.syncLog.findFirst({
                where: {
                    channelId,
                    status: 'COMPLETED',
                },
                orderBy: { completedAt: 'desc' },
            });

            const since = lastSync?.completedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
            const pmsInventory = await this.fetchPmsInventory(since, new Date());

            const result = await adapter.pushInventory(pmsInventory);

            return result;
        } catch (error) {
            this.engineLogger.error('Incremental sync failed', error as Error, { channelId });
            throw error;
        }
    }

    async importBookingsFromChannel(channelId: string, since?: Date): Promise<ImportResult> {
        this.engineLogger.info('Importing bookings from channel', { channelId });

        try {
            const channel = await db.channel.findUnique({ where: { id: channelId } });
            if (!channel) {
                throw new Error(`Channel not found: ${channelId}`);
            }

            const adapter = channelRegistry.get(channel.name as ChannelName);
            if (!adapter) {
                throw new Error(`Channel adapter not available: ${channel.name}`);
            }

            const syncSince = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const otaBookings = await adapter.fetchBookings(syncSince);

            const result: ImportResult = {
                totalBookings: otaBookings.length,
                imported: 0,
                updated: 0,
                failed: 0,
                conflicts: [],
                errors: [],
            };

            for (const otaBooking of otaBookings) {
                try {
                    // Check if booking already exists
                    const existingMapping = await db.otaBookingMapping.findFirst({
                        where: {
                            channelBookingId: otaBooking.otaBookingId,
                            channelId,
                        },
                    });

                    if (existingMapping) {
                        // Update existing booking
                        result.updated++;
                    } else {
                        // Import new booking
                        await this.importBooking(otaBooking, channelId);
                        result.imported++;
                    }
                } catch (error) {
                    result.failed++;
                    result.errors.push({
                        bookingId: otaBooking.otaBookingId,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            return result;
        } catch (error) {
            this.engineLogger.error('Booking import failed', error as Error, { channelId });
            throw error;
        }
    }

    async pushBookingUpdate(bookingId: string): Promise<SyncResult> {
        this.engineLogger.info('Pushing booking update', { bookingId });

        try {
            const booking = await db.booking.findUnique({
                where: { id: bookingId },
                include: { room: true },
            });

            if (!booking) {
                throw new Error(`Booking not found: ${bookingId}`);
            }

            // Find OTA mappings for this booking
            const mappings = await db.otaBookingMapping.findMany({
                where: { bookingId },
            });

            const results: SyncResult[] = [];

            for (const mapping of mappings) {
                const channel = await db.channel.findUnique({ where: { id: mapping.channelId } });
                if (!channel) continue;

                const adapter = channelRegistry.get(channel.name as ChannelName);
                if (!adapter) continue;

                const update = {
                    pmsBookingId: booking.id,
                    otaBookingId: mapping.channelBookingId,
                    status: booking.status as 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED',
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                };

                const result = await adapter.pushBookingUpdate(update);
                results.push(result);
            }

            // Aggregate results
            return {
                success: results.every((r) => r.success),
                itemsSynced: results.reduce((sum, r) => sum + r.itemsSynced, 0),
                itemsFailed: results.reduce((sum, r) => sum + r.itemsFailed, 0),
                errors: results.flatMap((r) => r.errors),
                durationMs: 0,
                timestamp: new Date(),
            };
        } catch (error) {
            this.engineLogger.error('Booking update push failed', error as Error, { bookingId });
            throw error;
        }
    }

    private async fetchPmsInventory(startDate?: Date, endDate?: Date): Promise<InventoryUpdate[]> {
        const start = startDate ?? new Date();
        const end = endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Get all rooms
        const rooms = await db.room.findMany({
            where: { propertyId: 'default' },
            include: { bookings: true },
        });

        const inventory: InventoryUpdate[] = [];

        for (const room of rooms) {
            // Generate inventory for each date
            const currentDate = new Date(start);
            while (currentDate <= end) {
                // Check if room is booked on this date
                const isBooked = room.bookings.some((booking: { checkIn: Date; checkOut: Date; status: string }) => {
                    const bookingStart = new Date(booking.checkIn);
                    const bookingEnd = new Date(booking.checkOut);
                    return (
                        booking.status !== 'CANCELLED' &&
                        currentDate >= bookingStart &&
                        currentDate < bookingEnd
                    );
                });

                inventory.push({
                    roomId: room.id,
                    otaRoomTypeId: '', // Will be mapped by adapter
                    date: new Date(currentDate),
                    availableRooms: isBooked ? 0 : 1,
                    totalRooms: 1,
                    status: isBooked ? 'SOLD_OUT' : 'AVAILABLE',
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return inventory;
    }

    private async importBooking(otaBooking: OtaBooking, channelId: string): Promise<void> {
        // Create guest if not exists
        let guest = await db.guest.findFirst({
            where: { phone: otaBooking.guestPhone },
        });

        if (!guest) {
            guest = await db.guest.create({
                data: {
                    name: otaBooking.guestName,
                    phone: otaBooking.guestPhone,
                    email: otaBooking.guestEmail,
                },
            });
        }

        // Find available room
        const availableRoom = await db.room.findFirst({
            where: {
                status: 'VACANT',
                bookings: {
                    none: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                        checkIn: { lt: otaBooking.checkOut },
                        checkOut: { gt: otaBooking.checkIn },
                    },
                },
            },
        });

        if (!availableRoom) {
            throw new Error('No available room for booking');
        }

        // Create booking
        const booking = await db.booking.create({
            data: {
                bookingNumber: `OTA-${otaBooking.otaBookingId}`,
                guestId: guest.id,
                roomId: availableRoom.id,
                checkIn: otaBooking.checkIn,
                checkOut: otaBooking.checkOut,
                bookingSource: 'OTA',
                bookingType: 'DAILY',
                status: 'CONFIRMED',
                paymentStatus: 'PENDING',
                baseAmount: new (db as any).Prisma.Decimal(otaBooking.totalAmount),
                totalAmount: new (db as any).Prisma.Decimal(otaBooking.totalAmount),
                specialRequests: otaBooking.specialRequests,
            },
        });

        // Create OTA mapping
        await db.otaBookingMapping.create({
            data: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                channelId,
                channelBookingId: otaBooking.otaBookingId,
                channelBookingRef: otaBooking.otaReference,
                lastSyncAt: new Date(),
                syncStatus: 'SYNCED',
            },
        });
    }
}
