// apps/admin/src/lib/api.ts
// API client functions for admin dashboard

const API_BASE = "/api";

// ─── Maintenance ─────────────────────────────────────────────────────────────

export interface MaintenanceRecord {
    id: string;
    roomId: string;
    room: { roomNumber: string; type: string };
    type: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "REPORTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    description: string;
    reportedAt: string;
    completedAt: string | null;
    reportedBy: { name: string } | null;
}

export async function fetchMaintenance(filters?: {
    status?: string;
    priority?: string;
    roomId?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ records: MaintenanceRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.roomId) params.set("roomId", filters.roomId);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/maintenance?${params}`);
    return res.json();
}

export async function createMaintenance(data: Partial<MaintenanceRecord>) {
    const res = await fetch(`${API_BASE}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateMaintenanceStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    return res.json();
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────

export interface HousekeepingTask {
    id: string;
    roomId: string;
    room: { roomNumber: string; type: string };
    type: "CLEANING" | "INSPECTION" | "MAINTENANCE";
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    priority: "LOW" | "MEDIUM" | "HIGH";
    assignedTo: { id: string; name: string } | null;
    dueAt: string;
    completedAt: string | null;
}

export async function fetchHousekeepingTasks(filters?: {
    status?: string;
    date?: string;
}): Promise<{ tasks: HousekeepingTask[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date) params.set("date", filters.date);
    const res = await fetch(`${API_BASE}/housekeeping/tasks?${params}`);
    return res.json();
}

export async function fetchHousekeepingAssignments(date?: string) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    const res = await fetch(`${API_BASE}/housekeeping/assignments?${params}`);
    return res.json();
}

export async function assignHousekeepingTask(taskId: string, staffId: string) {
    const res = await fetch(`${API_BASE}/housekeeping/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, staffId }),
    });
    return res.json();
}

export async function updateHousekeepingTaskStatus(taskId: string, status: string) {
    const res = await fetch(`${API_BASE}/housekeeping/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    return res.json();
}

export async function fetchHousekeepingProgress(date?: string) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    const res = await fetch(`${API_BASE}/housekeeping/tasks/progress?${params}`);
    return res.json();
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export interface InventoryRecord {
    id: string;
    roomTypeId: string;
    roomType: { name: string; basePrice: string };
    date: string;
    totalRooms: number;
    availableRooms: number;
    bookedRooms: number;
    blockedRooms: number;
    maintenanceRooms: number;
}

export async function fetchInventory(filters?: {
    roomTypeId?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ records: InventoryRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.roomTypeId) params.set("roomTypeId", filters.roomTypeId);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/inventory?${params}`);
    return res.json();
}

export async function updateInventory(id: string, data: Partial<InventoryRecord>) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Seasonal Pricing ─────────────────────────────────────────────────────────

export interface SeasonalRate {
    id: string;
    roomTypeId: string;
    roomType: { name: string };
    name: string;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
    isActive: boolean;
}

export async function fetchSeasonalRates(): Promise<{ rates: SeasonalRate[] }> {
    const res = await fetch(`${API_BASE}/seasonal-rates`);
    return res.json();
}

export async function createSeasonalRate(data: Partial<SeasonalRate>) {
    const res = await fetch(`${API_BASE}/seasonal-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateSeasonalRate(id: string, data: Partial<SeasonalRate>) {
    const res = await fetch(`${API_BASE}/seasonal-rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteSeasonalRate(id: string) {
    const res = await fetch(`${API_BASE}/seasonal-rates/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

// ─── Dynamic Pricing ─────────────────────────────────────────────────────────

export interface DynamicPricingRule {
    id: string;
    name: string;
    condition: {
        type: "DAY_OF_WEEK" | "OCCUPANCY" | "LEAD_TIME" | "SPECIAL_EVENT";
        operator: "EQ" | "GT" | "LT" | "GTE" | "LTE";
        value: string | number;
    };
    priceAdjustment: number;
    priority: number;
    isActive: boolean;
}

export async function fetchDynamicPricingRules(): Promise<{ rules: DynamicPricingRule[] }> {
    const res = await fetch(`${API_BASE}/dynamic-pricing`);
    return res.json();
}

export async function createDynamicPricingRule(data: Partial<DynamicPricingRule>) {
    const res = await fetch(`${API_BASE}/dynamic-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateDynamicPricingRule(id: string, data: Partial<DynamicPricingRule>) {
    const res = await fetch(`${API_BASE}/dynamic-pricing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteDynamicPricingRule(id: string) {
    const res = await fetch(`${API_BASE}/dynamic-pricing/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

// ─── Blackout Dates ─────────────────────────────────────────────────────────

export interface BlackoutDate {
    id: string;
    startDate: string;
    endDate: string;
    roomTypeId: string | null;
    roomType: { name: string } | null;
    reason: string;
    source: string | null;
    createdAt: string;
}

export async function fetchBlackoutDates(filters?: {
    roomTypeId?: string;
    source?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ dates: BlackoutDate[] }> {
    const params = new URLSearchParams();
    if (filters?.roomTypeId) params.set("roomTypeId", filters.roomTypeId);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/blackout-dates?${params}`);
    return res.json();
}

export async function createBlackoutDate(data: Partial<BlackoutDate>) {
    const res = await fetch(`${API_BASE}/blackout-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateBlackoutDate(id: string, data: Partial<BlackoutDate>) {
    const res = await fetch(`${API_BASE}/blackout-dates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteBlackoutDate(id: string) {
    const res = await fetch(`${API_BASE}/blackout-dates/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

// ─── Staff ─────────────────────────────────────────────────────────────────

export interface StaffProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    role: string;
    isActive: boolean;
    hireDate: string;
}

export async function fetchStaff(filters?: {
    department?: string;
    search?: string;
}): Promise<{ staff: StaffProfile[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.department) params.set("department", filters.department);
    if (filters?.search) params.set("search", filters.search);
    const res = await fetch(`${API_BASE}/staff/profiles?${params}`);
    return res.json();
}

export async function createStaffProfile(data: Partial<StaffProfile>) {
    const res = await fetch(`${API_BASE}/staff/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateStaffProfile(id: string, data: Partial<StaffProfile>) {
    const res = await fetch(`${API_BASE}/staff/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Shifts ─────────────────────────────────────────────────────────────────

export interface ShiftType {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
}

export interface ShiftAssignment {
    id: string;
    staffId: string;
    staff: { name: string; department: string };
    shiftType: ShiftType;
    date: string;
    status: "SCHEDULED" | "CHECKED_IN" | "CHECKED_OUT" | "ABSENT";
    checkInAt: string | null;
    checkOutAt: string | null;
}

export async function fetchShiftTypes(): Promise<{ types: ShiftType[] }> {
    const res = await fetch(`${API_BASE}/shifts/types`);
    return res.json();
}

export async function fetchShifts(filters?: {
    date?: string;
    staffId?: string;
}): Promise<{ shifts: ShiftAssignment[] }> {
    const params = new URLSearchParams();
    if (filters?.date) params.set("date", filters.date);
    if (filters?.staffId) params.set("staffId", filters.staffId);
    const res = await fetch(`${API_BASE}/shifts/assign?${params}`);
    return res.json();
}

export async function assignShift(data: { staffId: string; shiftTypeId: string; date: string }) {
    const res = await fetch(`${API_BASE}/shifts/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function checkInShift(shiftId: string) {
    const res = await fetch(`${API_BASE}/shifts/${shiftId}/check-in`, {
        method: "POST",
    });
    return res.json();
}

export async function checkOutShift(shiftId: string) {
    const res = await fetch(`${API_BASE}/shifts/${shiftId}/check-out`, {
        method: "POST",
    });
    return res.json();
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface AttendanceRecord {
    id: string;
    staffId: string;
    staff: { name: string; department: string };
    date: string;
    checkInAt: string;
    checkOutAt: string | null;
    totalHours: number;
    status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
}

export async function fetchAttendanceReport(filters?: {
    fromDate?: string;
    toDate?: string;
    department?: string;
    staffId?: string;
}): Promise<{ records: AttendanceRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.department) params.set("department", filters.department);
    if (filters?.staffId) params.set("staffId", filters.staffId);
    const res = await fetch(`${API_BASE}/attendance/report?${params}`);
    return res.json();
}

// ─── Staff Activity ───────────────────────────────────────────────────────────

export interface StaffActivity {
    id: string;
    staffId: string;
    staff: { name: string };
    action: string;
    entityType: string;
    entityId: string;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
}

export async function fetchStaffActivity(filters?: {
    staffId?: string;
    action?: string;
    entityType?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
}): Promise<{ activities: StaffActivity[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.staffId) params.set("staffId", filters.staffId);
    if (filters?.action) params.set("action", filters.action);
    if (filters?.entityType) params.set("entityType", filters.entityType);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.search) params.set("search", filters.search);
    const res = await fetch(`${API_BASE}/staff-activity?${params}`);
    return res.json();
}

// ─── Reports: Occupancy ──────────────────────────────────────────────────────

export interface OccupancyReport {
    date: string;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    occupancyRate: number;
    roomTypeBreakdown: Record<string, { total: number; occupied: number; rate: number }>;
}

export async function fetchOccupancyReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ reports: OccupancyReport[]; summary: { avgOccupancy: number; totalBookings: number } }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/occupancy?${params}`);
    return res.json();
}

// ─── Reports: Revenue ────────────────────────────────────────────────────────

export interface RevenueReport {
    date: string;
    totalRevenue: number;
    roomRevenue: number;
    addonRevenue: number;
    revpar: number;
    adr: number;
    sourceBreakdown: Record<string, number>;
}

export async function fetchRevenueReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ reports: RevenueReport[]; summary: { totalRevenue: number; avgRevpar: number; avgAdr: number } }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/revenue?${params}`);
    return res.json();
}

// ─── Reports: Bookings ──────────────────────────────────────────────────────

export interface BookingSourceReport {
    source: string;
    count: number;
    revenue: number;
    percentage: number;
}

export async function fetchBookingSourceReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ sources: BookingSourceReport[] }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/bookings/by-source?${params}`);
    return res.json();
}

export interface CancellationReport {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    cancelledAt: string;
    reason: string | null;
    refundAmount: number;
}

export async function fetchCancellationReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ cancellations: CancellationReport[]; totalCount: number; totalRefunds: number }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/bookings/cancellations?${params}`);
    return res.json();
}

export interface NoShowReport {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    scheduledDate: string;
    totalAmount: number;
}

export async function fetchNoShowReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ noShows: NoShowReport[]; totalCount: number; totalRevenue: number }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/bookings/no-shows?${params}`);
    return res.json();
}

// ─── Reports: Payments ───────────────────────────────────────────────────────

export interface PaymentReconciliation {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentMethod: string;
    transactionId: string | null;
    settledAt: string | null;
}

export async function fetchPaymentReconciliation(filters?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
}): Promise<{ payments: PaymentReconciliation[]; summary: { totalAmount: number; settledAmount: number; pendingAmount: number } }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.status) params.set("status", filters.status);
    const res = await fetch(`${API_BASE}/reports/payments/reconciliation?${params}`);
    return res.json();
}

export interface CashPaymentReport {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    amount: number;
    collectedBy: { name: string };
    collectedAt: string;
}

export async function fetchCashPayments(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ payments: CashPaymentReport[]; totalAmount: number }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/payments/cash?${params}`);
    return res.json();
}

export interface OnlinePaymentReport {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    amount: number;
    method: string;
    transactionId: string;
    status: string;
    processedAt: string;
}

export async function fetchOnlinePayments(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ payments: OnlinePaymentReport[]; totalAmount: number }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/payments/online?${params}`);
    return res.json();
}

export interface OutstandingPayment {
    id: string;
    bookingNumber: string;
    guest: { name: string; phone: string };
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    dueDate: string;
}

export async function fetchOutstandingPayments(): Promise<{ payments: OutstandingPayment[]; totalPending: number }> {
    const res = await fetch(`${API_BASE}/reports/payments/outstanding`);
    return res.json();
}

export interface TaxReport {
    id: string;
    bookingNumber: string;
    guest: { name: string };
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    invoiceNumber: string;
    invoiceDate: string;
}

export async function fetchGSTReport(filters?: {
    fromDate?: string;
    toDate?: string;
}): Promise<{ records: TaxReport[]; summary: { totalTaxable: number; totalCGST: number; totalSGST: number; totalIGST: number; totalTax: number } }> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/tax/gst?${params}`);
    return res.json();
}

// ─── OTA Sync ─────────────────────────────────────────────────────────────

export interface SyncStatus {
    channelId: string;
    channelName: string;
    lastSyncAt: string | null;
    status: "SUCCESS" | "FAILED" | "PENDING";
    errorMessage: string | null;
    inventorySynced: boolean;
    pricingSynced: boolean;
    bookingsSynced: boolean;
}

export async function fetchOTASyncStatus(): Promise<{ channels: SyncStatus[] }> {
    const res = await fetch(`${API_BASE}/ota-sync/status`);
    return res.json();
}

export async function triggerOTASync(channelId: string, type: "full" | "inventory" | "pricing") {
    const res = await fetch(`${API_BASE}/channels/${channelId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
    });
    return res.json();
}

export async function fetchSyncHistory(channelId: string): Promise<{ history: SyncStatus[] }> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/sync/history`);
    return res.json();
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface NotificationTemplate {
    id: string;
    name: string;
    type: "EMAIL" | "SMS" | "PUSH";
    subject: string | null;
    content: string;
    variables: string[];
    isActive: boolean;
    createdAt: string;
}

export async function fetchNotificationTemplates(): Promise<{ templates: NotificationTemplate[] }> {
    const res = await fetch(`${API_BASE}/notification-templates`);
    return res.json();
}

export async function createNotificationTemplate(data: Partial<NotificationTemplate>) {
    const res = await fetch(`${API_BASE}/notification-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateNotificationTemplate(id: string, data: Partial<NotificationTemplate>) {
    const res = await fetch(`${API_BASE}/notification-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export interface NotificationLog {
    id: string;
    templateId: string;
    template: { name: string };
    recipient: string;
    channel: "EMAIL" | "SMS" | "PUSH";
    status: "SENT" | "DELIVERED" | "FAILED" | "PENDING";
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
}

export async function fetchNotificationLogs(filters?: {
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ logs: NotificationLog[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`${API_BASE}/reports/notifications?${params}`);
    return res.json();
}

// ─── Disputes ──────────────────────────────────────────────────────────────

export interface Dispute {
    id: string;
    bookingId: string;
    booking: { bookingNumber: string; guest: { name: string } };
    type: "BILLING" | "SERVICE" | "DAMAGE" | "OTHER";
    status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "ESCALATED";
    subject: string;
    description: string;
    amount: number;
    resolution: string | null;
    resolvedAt: string | null;
    createdAt: string;
    responses: DisputeResponse[];
}

export interface DisputeResponse {
    id: string;
    disputeId: string;
    responderId: string;
    responder: { name: string };
    message: string;
    createdAt: string;
}

export async function fetchDisputes(filters?: {
    status?: string;
    type?: string;
}): Promise<{ disputes: Dispute[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.type) params.set("type", filters.type);
    const res = await fetch(`${API_BASE}/disputes?${params}`);
    return res.json();
}

export async function respondToDispute(disputeId: string, message: string) {
    const res = await fetch(`${API_BASE}/disputes/${disputeId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });
    return res.json();
}

export async function resolveDispute(disputeId: string, resolution: string, adjustmentAmount?: number) {
    const res = await fetch(`${API_BASE}/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, adjustmentAmount }),
    });
    return res.json();
}

// ─── Fraud Detection ───────────────────────────────────────────────────────

export interface FlaggedBooking {
    id: string;
    bookingId: string;
    booking: { bookingNumber: string; guest: { name: string; phone: string }; totalAmount: string };
    riskScore: number;
    riskFactors: string[];
    status: "PENDING" | "CONFIRMED" | "DISMISSED";
    reviewedBy: { name: string } | null;
    reviewedAt: string | null;
    notes: string | null;
    createdAt: string;
}

export async function fetchFlaggedBookings(): Promise<{ bookings: FlaggedBooking[]; total: number }> {
    const res = await fetch(`${API_BASE}/fraud-detection`);
    return res.json();
}

export async function confirmFraudulentBooking(id: string, notes: string) {
    const res = await fetch(`${API_BASE}/fraud-detection/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
    });
    return res.json();
}

export async function dismissFraudAlert(id: string, notes: string) {
    const res = await fetch(`${API_BASE}/fraud-detection/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
    });
    return res.json();
}

// ─── Room Conflicts ────────────────────────────────────────────────────────

export interface RoomConflict {
    id: string;
    roomId: string;
    room: { roomNumber: string };
    date: string;
    conflictType: "DOUBLE_BOOKING" | "MAINTENANCE_BLOCK" | "HOUSE_USE";
    bookingId: string | null;
    booking: { bookingNumber: string; guest: { name: string } } | null;
    status: "DETECTED" | "RESOLVED" | "IGNORED";
    resolution: string | null;
    createdAt: string;
}

export async function fetchRoomConflicts(filters?: {
    status?: string;
    date?: string;
}): Promise<{ conflicts: RoomConflict[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date) params.set("date", filters.date);
    const res = await fetch(`${API_BASE}/room-conflicts?${params}`);
    return res.json();
}

export async function resolveRoomConflict(id: string, resolution: string) {
    const res = await fetch(`${API_BASE}/room-conflicts/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
    });
    return res.json();
}

export async function holdRoom(roomId: string, date: string, reason: string) {
    const res = await fetch(`${API_BASE}/room-conflicts/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, date, reason }),
    });
    return res.json();
}

// ─── Offline Entries ────────────────────────────────────────────────────────

export interface OfflineEntry {
    id: string;
    bookingData: Record<string, unknown>;
    status: "PENDING" | "SYNCED" | "CONFLICT" | "FAILED";
    createdAt: string;
    syncedAt: string | null;
    conflictReason: string | null;
    bookingId: string | null;
}

export async function fetchOfflineEntries(): Promise<{ entries: OfflineEntry[]; total: number }> {
    const res = await fetch(`${API_BASE}/offline/entries/pending`);
    return res.json();
}

export async function syncOfflineEntry(id: string) {
    const res = await fetch(`${API_BASE}/offline/entries/${id}/sync`, {
        method: "POST",
    });
    return res.json();
}

export async function fetchOfflineConflicts(id: string) {
    const res = await fetch(`${API_BASE}/offline/entries/${id}/conflicts`);
    return res.json();
}

// ─── Booking Recovery ───────────────────────────────────────────────────────

export interface LostBooking {
    id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    roomNumber: string | null;
    totalAmount: string;
    status: string;
    createdAt: string;
    matchConfidence: number;
}

export async function searchLostBookings(query: string): Promise<{ bookings: LostBooking[] }> {
    const params = new URLSearchParams({ q: query });
    const res = await fetch(`${API_BASE}/booking-recovery/search?${params}`);
    return res.json();
}

export async function recoverBooking(id: string, targetBookingId: string) {
    const res = await fetch(`${API_BASE}/booking-recovery/${id}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBookingId }),
    });
    return res.json();
}

export async function mergeBookings(sourceId: string, targetId: string) {
    const res = await fetch(`${API_BASE}/booking-recovery/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, targetId }),
    });
    return res.json();
}

// ─── Corporate Contracts ────────────────────────────────────────────────────

export interface CorporateContract {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    discountPercentage: number;
    creditLimit: number;
    billingCycle: "MONTHLY" | "QUARTERLY";
    status: "ACTIVE" | "EXPIRED" | "TERMINATED";
    startDate: string;
    endDate: string;
    createdAt: string;
}

export async function fetchCorporateContracts(filters?: {
    status?: string;
    search?: string;
}): Promise<{ contracts: CorporateContract[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    const res = await fetch(`${API_BASE}/corporate-contracts?${params}`);
    return res.json();
}

export async function createCorporateContract(data: Partial<CorporateContract>) {
    const res = await fetch(`${API_BASE}/corporate-contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateCorporateContract(id: string, data: Partial<CorporateContract>) {
    const res = await fetch(`${API_BASE}/corporate-contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function terminateCorporateContract(id: string) {
    const res = await fetch(`${API_BASE}/corporate-contracts/${id}/terminate`, {
        method: "POST",
    });
    return res.json();
}

export async function renewCorporateContract(id: string, newEndDate: string) {
    const res = await fetch(`${API_BASE}/corporate-contracts/${id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEndDate }),
    });
    return res.json();
}

// ─── Monthly Billing ─────────────────────────────────────────────────────────

export interface MonthlyInvoice {
    id: string;
    invoiceNumber: string;
    corporateContractId: string;
    contract: { companyName: string };
    billingMonth: string;
    totalAmount: number;
    taxAmount: number;
    grandTotal: number;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
    dueDate: string;
    paidAt: string | null;
    bookingCount: number;
    createdAt: string;
}

export async function fetchMonthlyInvoices(filters?: {
    month?: string;
    status?: string;
}): Promise<{ invoices: MonthlyInvoice[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.month) params.set("month", filters.month);
    if (filters?.status) params.set("status", filters.status);
    const res = await fetch(`${API_BASE}/monthly-billing?${params}`);
    return res.json();
}

export async function generateMonthlyInvoice(contractId: string, month: string) {
    const res = await fetch(`${API_BASE}/monthly-billing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, month }),
    });
    return res.json();
}

export async function batchGenerateInvoices(month: string) {
    const res = await fetch(`${API_BASE}/monthly-billing/batch-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
    });
    return res.json();
}

// ─── Package Deals ──────────────────────────────────────────────────────────

export interface PackageDeal {
    id: string;
    name: string;
    description: string;
    roomTypeId: string;
    roomType: { name: string };
    components: PackageComponent[];
    price: number;
    validityStart: string;
    validityEnd: string;
    isActive: boolean;
    createdAt: string;
}

export interface PackageComponent {
    type: "ROOM" | "BREAKFAST" | "LUNCH" | "DINNER" | "SPA" | "AIRPORT_TRANSFER" | "TOUR" | "OTHER";
    name: string;
    quantity: number;
    unitPrice: number;
}

export async function fetchPackageDeals(): Promise<{ deals: PackageDeal[] }> {
    const res = await fetch(`${API_BASE}/package-deals`);
    return res.json();
}

export async function createPackageDeal(data: Partial<PackageDeal>) {
    const res = await fetch(`${API_BASE}/package-deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updatePackageDeal(id: string, data: Partial<PackageDeal>) {
    const res = await fetch(`${API_BASE}/package-deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deletePackageDeal(id: string) {
    const res = await fetch(`${API_BASE}/package-deals/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

// ─── Coupons ───────────────────────────────────────────────────────────────

export interface Coupon {
    id: string;
    code: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    minBookingAmount: number;
    maxDiscount: number | null;
    validFrom: string;
    validUntil: string;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
}

export async function fetchCoupons(): Promise<{ coupons: Coupon[] }> {
    const res = await fetch(`${API_BASE}/coupons`);
    return res.json();
}

export async function createCoupon(data: Partial<Coupon>) {
    const res = await fetch(`${API_BASE}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateCoupon(id: string, data: Partial<Coupon>) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteCoupon(id: string) {
    const res = await fetch(`${API_BASE}/coupons/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

export async function bulkGenerateCoupons(count: number, prefix: string, data: Partial<Coupon>) {
    const res = await fetch(`${API_BASE}/coupons/bulk-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, prefix, ...data }),
    });
    return res.json();
}

// ─── Loyalty ────────────────────────────────────────────────────────────────

export interface LoyaltyMember {
    id: string;
    guestId: string;
    guest: { name: string; email: string; phone: string };
    tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    points: number;
    lifetimePoints: number;
    createdAt: string;
}

export interface LoyaltyTransaction {
    id: string;
    memberId: string;
    type: "EARN" | "REDEEM" | "EXPIRE" | "ADJUST";
    points: number;
    balance: number;
    description: string;
    referenceId: string | null;
    createdAt: string;
}

export async function fetchLoyaltyMembers(): Promise<{ members: LoyaltyMember[]; total: number }> {
    const res = await fetch(`${API_BASE}/loyalty`);
    return res.json();
}

export async function fetchLoyaltyPointsHistory(memberId: string): Promise<{ transactions: LoyaltyTransaction[] }> {
    const res = await fetch(`${API_BASE}/loyalty/${memberId}/transactions`);
    return res.json();
}

export interface TierBenefit {
    tier: string;
    discountPercentage: number;
    pointsMultiplier: number;
    freeUpgrade: boolean;
    lateCheckout: boolean;
    priorityService: boolean;
}

export async function fetchTierBenefits(): Promise<{ benefits: TierBenefit[] }> {
    const res = await fetch(`${API_BASE}/loyalty/tier-benefits`);
    return res.json();
}

// ─── Guest Preferences ──────────────────────────────────────────────────────

export interface GuestPreferences {
    id: string;
    guestId: string;
    roomTypePreference: string | null;
    floorPreference: "LOW" | "HIGH" | "NONE";
    bedPreference: "SINGLE" | "DOUBLE" | "NONE";
    smokingPreference: boolean;
    quietRoom: boolean;
    dietaryRestrictions: string[];
    specialOccasions: string[];
    amenities: string[];
    notes: string | null;
}

export async function fetchGuestPreferences(guestId: string): Promise<GuestPreferences> {
    const res = await fetch(`${API_BASE}/guests/${guestId}/preferences`);
    return res.json();
}

export async function updateGuestPreferences(guestId: string, data: Partial<GuestPreferences>) {
    const res = await fetch(`${API_BASE}/guests/${guestId}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Guest History ─────────────────────────────────────────────────────────

export interface GuestStayHistory {
    id: string;
    bookingId: string;
    bookingNumber: string;
    room: { roomNumber: string; type: string };
    checkIn: string;
    checkOut: string;
    totalAmount: string;
    status: string;
}

export interface GuestSpendingHistory {
    totalSpent: number;
    bookingCount: number;
    averagePerStay: number;
    spendingByMonth: Record<string, number>;
}

export interface GuestNote {
    id: string;
    content: string;
    createdBy: { name: string };
    createdAt: string;
}

export interface GuestTag {
    id: string;
    name: string;
    color: string;
}

export async function fetchGuestHistory(guestId: string): Promise<{
    stays: GuestStayHistory[];
    spending: GuestSpendingHistory;
}> {
    const res = await fetch(`${API_BASE}/guests/${guestId}/history`);
    return res.json();
}

export async function fetchGuestNotes(guestId: string): Promise<{ notes: GuestNote[] }> {
    const res = await fetch(`${API_BASE}/guests/${guestId}/notes`);
    return res.json();
}

export async function addGuestNote(guestId: string, content: string) {
    const res = await fetch(`${API_BASE}/guests/${guestId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
    return res.json();
}

export async function fetchGuestTags(guestId: string): Promise<{ tags: GuestTag[] }> {
    const res = await fetch(`${API_BASE}/guests/${guestId}/tags`);
    return res.json();
}

export async function addGuestTag(guestId: string, tagName: string) {
    const res = await fetch(`${API_BASE}/guests/${guestId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagName }),
    });
    return res.json();
}

export async function removeGuestTag(guestId: string, tagId: string) {
    const res = await fetch(`${API_BASE}/guests/${guestId}/tags/${tagId}`, {
        method: "DELETE",
    });
    return res.json();
}

// ─── Automation Rules ──────────────────────────────────────────────────────────

export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    trigger: "BOOKING_CREATED" | "CHECK_IN" | "CHECK_OUT" | "NO_SHOW" | "PAYMENT_RECEIVED" | "SCHEDULE" | "COMPLAINT_LOGGED";
    action: "SEND_SMS" | "SEND_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE" | "NOTIFY_STAFF" | "BLOCK_ROOM";
    condition: string | null;
    config: Record<string, unknown>;
    status: "ACTIVE" | "PAUSED" | "DISABLED";
    lastTriggered: string | null;
    triggerCount: number;
    createdAt: string;
    updatedAt: string;
}

export async function fetchAutomationRules(filters?: { status?: string }): Promise<{ rules: AutomationRule[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    const res = await fetch(`${API_BASE}/automation/rules?${params}`);
    return res.json();
}

export async function createAutomationRule(data: Partial<AutomationRule>) {
    const res = await fetch(`${API_BASE}/automation/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateAutomationRule(id: string, data: Partial<AutomationRule>) {
    const res = await fetch(`${API_BASE}/automation/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function deleteAutomationRule(id: string) {
    const res = await fetch(`${API_BASE}/automation/rules/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

export async function toggleAutomationRule(id: string, status: "ACTIVE" | "PAUSED") {
    return updateAutomationRule(id, { status });
}

// ─── Exceptions ────────────────────────────────────────────────────────────────

export type ExceptionType = "OVERBOOKING" | "PAYMENT_MISMATCH" | "MISSING_DOCUMENT" | "PRICING_ERROR" | "DOUBLE_BOOKING";
export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ExceptionStatus = "OPEN" | "RESOLVED" | "ESCALATED" | "DISMISSED";

export interface Exception {
    id: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    status: ExceptionStatus;
    title: string;
    description: string;
    entityType: "BOOKING" | "ROOM" | "PAYMENT" | "GUEST";
    entityId: string;
    relatedEntities: { type: string; id: string; label: string }[];
    resolution: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export async function fetchExceptions(filters?: {
    status?: ExceptionStatus;
    type?: ExceptionType;
}): Promise<{ exceptions: Exception[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.type) params.set("type", filters.type);
    const res = await fetch(`${API_BASE}/exceptions?${params}`);
    return res.json();
}

export async function createException(data: Partial<Exception>) {
    const res = await fetch(`${API_BASE}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function updateException(id: string, data: Partial<Exception>) {
    const res = await fetch(`${API_BASE}/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function resolveException(id: string, resolution: string) {
    return updateException(id, { status: "RESOLVED", resolution });
}

export async function escalateException(id: string) {
    return updateException(id, { status: "ESCALATED" });
}

// ─── Quick Actions Stats ───────────────────────────────────────────────────────

export interface QuickActionsStats {
    todayCheckIns: number;
    todayCheckOuts: number;
    pendingHousekeeping: number;
    openComplaints: number;
    maintenanceIssues: number;
    pendingPayments: number;
    pendingDocuments: number;
    openExceptions: number;
    activeRules: number;
}

export async function fetchQuickActionsStats(): Promise<{ stats: QuickActionsStats }> {
    const res = await fetch(`${API_BASE}/quick-actions/stats`);
    return res.json();
}