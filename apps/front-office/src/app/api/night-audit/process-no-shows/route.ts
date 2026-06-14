import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, Prisma } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api";
import { createAuditLog, getClientIp, verifyPropertyAccess } from "@the-rooms/api/middleware";
import { getNoShowPolicy, calculateNoShowCharge, getPotentialNoShows, markBookingAsNoShow } from "@the-rooms/db";

// POST /api/night-audit/process-no-shows - Batch process no-shows during night audit
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const userRole = session.user.role as string;
        // Only ADMIN and SUPER_ADMIN can process no-shows in batch
        if (userRole === "GUEST" || userRole === "FRONT_OFFICE") {
            return forbidden("Access denied - insufficient permissions");
        }

        const body = await request.json();
        const { propertyId = "default", date, dryRun = false } = body;

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        // Get no-show policy
        const policy = await getNoShowPolicy(propertyId);

        if (!policy.enabled) {
            return badRequest("No-show processing is disabled for this property");
        }

        // Determine the date to process
        const processDate = date ? new Date(date) : new Date();

        // Get potential no-shows
        const potentialNoShows = await getPotentialNoShows(propertyId, processDate);

        if (potentialNoShows.length === 0) {
            return ok({
                processed: 0,
                skipped: 0,
                totalIdentified: 0,
                message: "No potential no-shows found for processing",
                bookings: [],
            });
        }

        // If dry run, just return what would be processed
        if (dryRun) {
            const dryRunResults = await Promise.all(
                potentialNoShows.map(async (booking) => {
                    const { amount, description } = await calculateNoShowCharge(booking.id, policy);
                    return {
                        bookingId: booking.id,
                        bookingNumber: booking.bookingNumber,
                        guestName: booking.guest.name,
                        phone: booking.guest.phone,
                        roomNumber: booking.room.roomNumber,
                        checkIn: booking.checkIn,
                        noShowCharge: amount,
                        chargeDescription: description,
                    };
                })
            );

            return ok({
                processed: 0,
                skipped: 0,
                totalIdentified: potentialNoShows.length,
                dryRun: true,
                message: `Dry run: ${potentialNoShows.length} bookings would be processed as no-shows`,
                bookings: dryRunResults,
            });
        }

        // Process each potential no-show
        const results = [];
        let processed = 0;
        let skipped = 0;

        for (const booking of potentialNoShows) {
            try {
                // Calculate the no-show charge
                const { amount, description } = await calculateNoShowCharge(booking.id, policy);

                // Process in a transaction
                await db.$transaction(async (tx) => {
                    // Mark booking as no-show
                    await markBookingAsNoShow(booking.id, amount, tx);

                    // Create a payment record for the no-show charge
                    const payment = await tx.payment.create({
                        data: {
                            bookingId: booking.id,
                            amount: new Prisma.Decimal(amount),
                            method: "CASH",
                            status: "PENDING",
                        },
                    });

                    // Create audit log
                    await tx.auditLog.create({
                        data: {
                            userId: session.user.id,
                            bookingId: booking.id,
                            action: "BOOKING_NO_SHOW",
                            entity: "booking",
                            entityId: booking.id,
                            metadata: {
                                bookingNumber: booking.bookingNumber,
                                noShowCharge: amount,
                                chargeDescription: description,
                                processedAt: new Date().toISOString(),
                                processedBy: "nightAudit",
                            },
                        },
                    });
                });

                results.push({
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    guestName: booking.guest.name,
                    roomNumber: booking.room.roomNumber,
                    noShowCharge: amount,
                    status: "PROCESSED",
                });
                processed++;
            } catch (error) {
                console.error(`Error processing no-show for booking ${booking.bookingNumber}:`, error);
                results.push({
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    guestName: booking.guest.name,
                    roomNumber: booking.room.roomNumber,
                    status: "FAILED",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
                skipped++;
            }
        }

        // Create audit log for the batch operation
        await createAuditLog({
            userId: session.user.id,
            action: "BATCH_NO_SHOW_PROCESSED",
            entity: "nightAudit",
            entityId: propertyId,
            metadata: {
                propertyId,
                processDate: processDate.toISOString().split("T")[0],
                totalIdentified: potentialNoShows.length,
                processed,
                skipped,
                policy: {
                    chargeType: policy.chargeType,
                    chargeValue: policy.chargeValue,
                },
            },
            ipAddress: getClientIp(request),
        });

        return created({
            processed,
            skipped,
            totalIdentified: potentialNoShows.length,
            message: `Processed ${processed} no-shows, ${skipped} failed`,
            bookings: results,
        });
    } catch (error) {
        console.error("Error processing no-shows:", error);
        return serverError("Failed to process no-shows");
    }
}

// GET /api/night-audit/process-no-shows - Get potential no-shows for a date
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized("Authentication required");
        }

        const userRole = session.user.role as string;
        if (userRole === "GUEST") {
            return forbidden("Access denied");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") ?? "default";
        const dateParam = searchParams.get("date");

        // Property-based access control
        if (userRole !== "SUPER_ADMIN") {
            const hasAccess = await verifyPropertyAccess(
                session.user.id,
                propertyId,
                userRole
            );
            if (!hasAccess) {
                return forbidden("Access denied to this property");
            }
        }

        const processDate = dateParam ? new Date(dateParam) : new Date();

        // Get no-show policy
        const policy = await getNoShowPolicy(propertyId);

        // Get potential no-shows
        const potentialNoShows = await getPotentialNoShows(propertyId, processDate);

        // Calculate charges for each
        const noShowPreview = await Promise.all(
            potentialNoShows.map(async (booking) => {
                const { amount, description } = await calculateNoShowCharge(booking.id, policy);
                return {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    guestName: booking.guest.name,
                    phone: booking.guest.phone,
                    email: booking.guest.email,
                    roomNumber: booking.room.roomNumber,
                    roomType: booking.room.type,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    totalAmount: booking.totalAmount.toNumber(),
                    noShowCharge: amount,
                    chargeDescription: description,
                };
            })
        );

        const totalCharges = noShowPreview.reduce((sum, b) => sum + b.noShowCharge, 0);

        return ok({
            policy: {
                enabled: policy.enabled,
                chargeType: policy.chargeType,
                chargeValue: policy.chargeValue,
                cutoffHour: policy.cutoffHour,
            },
            processDate: processDate.toISOString().split("T")[0],
            totalPotentialNoShows: potentialNoShows.length,
            totalCharges,
            bookings: noShowPreview,
        });
    } catch (error) {
        console.error("Error getting potential no-shows:", error);
        return serverError("Failed to get potential no-shows");
    }
}
