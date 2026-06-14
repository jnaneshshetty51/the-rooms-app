// packages/channel-manager/src/core/ConflictResolver.ts
// Conflict resolution logic

import { ConflictStrategy } from '../types/channel';
import type { InventoryUpdate } from '../types/inventory';
import type { OtaBooking } from '../types/booking';
import type { SyncResult } from '../types';

export type ConflictType =
    | 'INVENTORY_MISMATCH'
    | 'RATE_MISMATCH'
    | 'BOOKING_DATE_MISMATCH'
    | 'BOOKING_ROOM_MISMATCH'
    | 'BOOKING_STATUS_MISMATCH';

export type ConflictResolution<T> =
    | { strategy: 'PMS_WINS'; resolvedAt: Date }
    | { strategy: 'OTA_WINS'; resolvedAt: Date }
    | { strategy: 'NEWEST_WINS'; resolvedAt: Date }
    | { strategy: 'MANUAL'; resolvedBy?: string; resolvedAt: Date; resolvedValue: T };

export interface Conflict<T> {
    id: string;
    type: ConflictType;
    channelId: string;
    pmsValue: T;
    otaValue: T;
    detectedAt: Date;
    resolution?: ConflictResolution<T>;
}

export class ConflictResolver {
    constructor(
        private defaultStrategy: ConflictStrategy = ConflictStrategy.PMS_WINS,
        private channelStrategies: Map<string, ConflictStrategy> = new Map()
    ) { }

    getStrategy(channelId: string): ConflictStrategy {
        return this.channelStrategies.get(channelId) ?? this.defaultStrategy;
    }

    setChannelStrategy(channelId: string, strategy: ConflictStrategy): void {
        this.channelStrategies.set(channelId, strategy);
    }

    resolveInventoryConflict(
        conflict: Conflict<InventoryUpdate>,
        channelId: string
    ): InventoryUpdate {
        const strategy = this.getStrategy(channelId);

        switch (strategy) {
            case ConflictStrategy.PMS_WINS:
                return conflict.pmsValue;
            case ConflictStrategy.OTA_WINS:
                return conflict.otaValue;
            case ConflictStrategy.NEWEST_WINS:
            case ConflictStrategy.MANUAL:
            default:
                // For inventory without timestamps, default to PMS value
                return conflict.pmsValue;
        }
    }

    resolveBookingConflict(
        conflict: Conflict<OtaBooking>,
        channelId: string
    ): OtaBooking | null {
        const strategy = this.getStrategy(channelId);

        switch (strategy) {
            case ConflictStrategy.PMS_WINS:
                // PMS is source of truth - return null to indicate no import
                return null;
            case ConflictStrategy.OTA_WINS:
                return conflict.otaValue;
            case ConflictStrategy.NEWEST_WINS:
                // Use updatedAt for booking conflicts since OtaBooking has timestamps
                return conflict.pmsValue.updatedAt > conflict.otaValue.updatedAt
                    ? conflict.pmsValue
                    : conflict.otaValue;
            case ConflictStrategy.MANUAL:
            default:
                return null;
        }
    }

    detectInventoryConflicts(
        pmsInventory: InventoryUpdate[],
        channelInventory: InventoryUpdate[],
        channelId: string
    ): Conflict<InventoryUpdate>[] {
        const conflicts: Conflict<InventoryUpdate>[] = [];
        const channelMap = new Map(
            channelInventory.map((inv) => [`${inv.roomId}-${this.formatDate(inv.date)}`, inv])
        );

        for (const pmsInv of pmsInventory) {
            const key = `${pmsInv.roomId}-${this.formatDate(pmsInv.date)}`;
            const channelInv = channelMap.get(key);

            if (channelInv && this.hasInventoryDifference(pmsInv, channelInv)) {
                conflicts.push({
                    id: `inv-${channelId}-${key}`,
                    type: 'INVENTORY_MISMATCH',
                    channelId,
                    pmsValue: pmsInv,
                    otaValue: channelInv,
                    detectedAt: new Date(),
                });
            }
        }

        return conflicts;
    }

    detectBookingConflicts(
        pmsBooking: { checkIn: Date; checkOut: Date; status: string } | null,
        otaBooking: OtaBooking,
        channelId: string
    ): Conflict<OtaBooking> | null {
        if (!pmsBooking) {
            return null; // No conflict - new booking
        }

        const pmsCheckIn = this.formatDate(pmsBooking.checkIn);
        const otaCheckIn = this.formatDate(otaBooking.checkIn);
        const pmsCheckOut = this.formatDate(pmsBooking.checkOut);
        const otaCheckOut = this.formatDate(otaBooking.checkOut);

        if (pmsCheckIn !== otaCheckIn || pmsCheckOut !== otaCheckOut) {
            return {
                id: `booking-${channelId}-${otaBooking.otaBookingId}`,
                type: 'BOOKING_DATE_MISMATCH',
                channelId,
                pmsValue: {
                    otaBookingId: '',
                    guestName: '',
                    guestPhone: '',
                    checkIn: pmsBooking.checkIn,
                    checkOut: pmsBooking.checkOut,
                    roomTypeId: '',
                    roomTypeName: '',
                    totalAmount: 0,
                    currency: 'INR',
                    status: pmsBooking.status as 'CONFIRMED' | 'CANCELLED' | 'MODIFIED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                otaValue: otaBooking,
                detectedAt: new Date(),
            };
        }

        return null;
    }

    private hasInventoryDifference(a: InventoryUpdate, b: InventoryUpdate): boolean {
        return (
            a.availableRooms !== b.availableRooms ||
            a.status !== b.status
        );
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
