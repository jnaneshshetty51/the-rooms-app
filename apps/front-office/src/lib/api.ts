// apps/front-office/src/lib/api.ts
// Front Office API client with property context helpers

const API_BASE = ''; // Same origin API calls

// ─── Property Settings ─────────────────────────────────────────────────────────

export interface PropertySettings {
    id: string;
    propertyId: string;
    hotelName: string;
    address?: string;
    phone?: string;
    email?: string;
    checkInTime?: string;
    checkOutTime?: string;
    lateCheckOutFee?: number;
    earlyCheckInFee?: number;
    extraGuestRateDaily?: number;
    gstNumber?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    cancellationPolicy?: string;
    // Policy settings
    noShowChargeType?: string;
    noShowChargeValue?: number;
    noShowCutoffHour?: number;
    noShowEnabled?: boolean;
    earlyCheckinEnabled?: boolean;
    earlyCheckinCutoffHour?: number;
    earlyCheckinChargeType?: string;
    lateCheckoutEnabled?: boolean;
    lateCheckoutCutoffHour?: number;
    lateCheckoutChargeType?: string;
    lateCheckoutMaxHour?: number;
    lateCheckoutFee?: number;
    emailOnBooking?: boolean;
    emailOnCancel?: boolean;
    dailyReport?: boolean;
    maintenanceAlerts?: boolean;
}

export interface PropertySettingsResponse {
    settings: PropertySettings;
}

/**
 * Fetch property settings for the current user's property
 */
export async function fetchPropertySettings(): Promise<PropertySettings | null> {
    try {
        const res = await fetch(`${API_BASE}/api/property/settings`, {
            credentials: 'include',
        });

        if (!res.ok) {
            if (res.status === 403) {
                console.error('No property access found');
                return null;
            }
            if (res.status === 401) {
                console.error('Unauthorized');
                return null;
            }
            throw new Error(`Failed to fetch property settings: ${res.status}`);
        }

        const data: PropertySettingsResponse = await res.json();
        return data.settings;
    } catch (error) {
        console.error('Error fetching property settings:', error);
        return null;
    }
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Parse check-in/check-out times from settings
 */
export function getCheckInOutTimes(settings: PropertySettings | null): {
    checkInTime: string;
    checkOutTime: string;
} {
    return {
        checkInTime: settings?.checkInTime || '14:00',
        checkOutTime: settings?.checkOutTime || '12:00',
    };
}

/**
 * Format time string to display format
 */
export function formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}
