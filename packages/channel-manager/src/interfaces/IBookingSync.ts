// packages/channel-manager/src/interfaces/IBookingSync.ts
// Booking sync interface

import type { SyncResult } from '../types';
import type { OtaBooking, BookingConflict, BookingSyncOptions, ImportResult } from '../types/booking';

export interface IBookingSync {
    // Sync operations
    importBookings(options: BookingSyncOptions): Promise<ImportResult>;
    exportBooking(bookingId: string, channelId: string): Promise<SyncResult>;
    updateBookingStatus(bookingId: string, status: string): Promise<SyncResult>;
    cancelBooking(bookingId: string, reason: string): Promise<SyncResult>;

    // Mapping
    getOtaBookingId(pmsBookingId: string): Promise<string | null>;
    getPmsBookingId(otaBookingId: string, channelId: string): Promise<string | null>;

    // Conflict handling
    detectConflicts(importedBookings: OtaBooking[]): BookingConflict[];
    resolveConflicts(conflicts: BookingConflict[]): Promise<BookingConflict[]>;

    // Guest creation
    createGuestFromOta(otaBooking: OtaBooking): Promise<string>;
}
