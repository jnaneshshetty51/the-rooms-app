// packages/channel-manager/src/types/booking.ts
// Booking sync type definitions

export interface OtaBooking {
    otaBookingId: string;
    otaReference?: string;
    guestName: string;
    guestEmail?: string;
    guestPhone: string;
    checkIn: Date;
    checkOut: Date;
    roomTypeId: string;
    roomTypeName: string;
    totalAmount: number;
    currency: string;
    status: 'CONFIRMED' | 'CANCELLED' | 'MODIFIED';
    specialRequests?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface BookingUpdate {
    pmsBookingId: string;
    otaBookingId: string;
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
    checkIn?: Date;
    checkOut?: Date;
}

export interface BookingConflict {
    pmsBookingId?: string;
    otaBookingId: string;
    conflictType: 'DATE_MISMATCH' | 'ROOM_MISMATCH' | 'GUEST_MISMATCH' | 'PRICE_MISMATCH';
    pmsValue: Partial<OtaBooking>;
    otaValue: OtaBooking;
    resolution: 'PMS_WINS' | 'OTA_WINS' | 'MANUAL';
    resolvedBooking?: OtaBooking;
    resolvedAt?: Date;
}

export interface BookingSyncOptions {
    channelId: string;
    propertyId: string;
    since?: Date;
    importNewBookings: boolean;
    updateExistingBookings: boolean;
    autoConfirm: boolean;
}

export interface ImportResult {
    totalBookings: number;
    imported: number;
    updated: number;
    failed: number;
    conflicts: BookingConflict[];
    errors: { bookingId: string; error: string }[];
}
