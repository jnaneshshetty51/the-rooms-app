import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Named export alias so API routes can use `const { db } = await import('@the-rooms/db')`
export const db = prisma;

// Re-export all query helpers so callers can use `@the-rooms/db` as a single import
export { createPayment, updatePaymentStatus, getPaymentsByBooking, getPaymentsByDateRange, recordRefund } from './queries/paymentQueries';
export { generateReceipt, generateReceiptNumber, createReceipt, createRefundReceipt, createAdvanceReceipt, getReceiptById, getReceiptByPaymentId, getReceiptByNumber, getReceipts, updateReceiptPdfUrl, cancelReceipt, numberToWords } from './queries/receiptQueries';
export { createBooking, getBookingById, getBookings, getBookingsByGuest, getBookingsByDate, updateBookingStatus, cancelBooking, isRoomAvailable, generateBookingNumber, getNoShowPolicy, calculateNoShowCharge, getPotentialNoShows, markBookingAsNoShow, getNoShowBookings } from './queries/bookingQueries';
export { getGuestByEmail, getGuestByPhone, uploadGuestDocument, getGuestDocuments, getDocumentsByBooking, createComplaint, getGuestComplaints, getComplaintByBooking, getGuestInvoices, getInvoiceById, getExtendStayRequest, createExtendStayRequest, createAddonRequest, getGuestAddonRequests, getGuestDashboardStats, createGuest, searchGuests, incrementStayCount, getGuests } from './queries/guestQueries';
export { getAllRooms, getAvailableRooms, getRoomById, getRoomsByType, updateRoomStatus, bulkUpdateRoomStatus, getRoomsNeedingCleaning, getRoomsByCleaningStatus, markRoomAsCleaned, markRoomAsDirty, markRoomAsCleaning, updateRoomCleaningNotes, reportRoomMaintenance } from './queries/roomQueries';
export { generateInvoice, generateInvoiceNumber, updateInvoicePdfUrl, getInvoiceByBookingId, getInvoiceByNumber, getInvoices, buildInvoiceLineItems, cancelInvoice, issueInvoice } from './queries/invoiceQueries';
export { calculatePrice, calculateBookingPrice } from './pricing';
export { isDateClosed, getLatestCloseDate, closeDay, getNightAuditReport, postRoomCharges, createDiscrepancy, getDiscrepancies, resolveDiscrepancy, updateDailyCloseWithCharges, verifyPayments } from './queries/nightAuditQueries';
export { getAllDiscountCodes, getDiscountCodeByCode, getDiscountCodeById, createDiscountCode, updateDiscountCode, deactivateDiscountCode, incrementDiscountUsage, validateDiscountCode, calculateDiscountAmount } from './queries/discountQueries';
export { getStayModificationPolicy, calculateStayModificationCharge, createStayModificationRequest, getPendingRequestByBookingId, getStayModificationRequestById, getPendingStayModifications, approveStayModificationRequest, rejectStayModificationRequest, getStayModificationHistory } from './queries/stayModificationQueries';
export { getAddonsByBooking, getAddonsByBookingGrouped, getAddonTotalsByBooking, getAddonById, createAddon, updateAddon, deleteAddon, getAddonTypes, getAddonTypeInfo, syncBookingExtrasAmount, getFolioSummary, ADDON_TYPES, calculateAddonGST } from './queries/addonQueries';
export { addToBlacklist, removeFromBlacklist, getBlacklistEntry, isGuestBlacklisted, getBlacklistEntries, searchBlacklist, updateBlacklistEntry, syncGuestBlacklistFlag } from './queries/blacklistQueries';
export { createCorporateAccount, getCorporateAccount, getCorporateAccountByName, listCorporateAccounts, updateCorporateAccount, getCorporateCreditUsage, validateCorporateCredit, updateCreditBalance, getCorporateAccountFullDetails, deleteCorporateAccount } from './queries/corporateAccountQueries';

export { createDamageAssessment, getDamageAssessmentById, getDamageAssessmentsByBooking, getDamageAssessmentsByRoom, updateDamageAssessment, deleteDamageAssessment, approveDamageCharge, getAllDamageAssessments } from './queries/damageAssessmentQueries';
export { calculateLateCheckoutFee, applyLateCheckoutFee, checkLateCheckoutEligibility } from './queries/lateCheckoutQueries';
export { recordRoomMove } from './queries/roomMoveQueries';
export { searchLostBookings, markBookingAsLost, recoverBooking, getLostBookings, getLostBookingById, identifyDuplicateBookings, mergeDuplicateBookings } from './queries/bookingRecoveryQueries';
export { createDispute, getDispute, getBookingDisputes, getDisputes, addDisputeResponse, resolveDispute, updateDisputeStatus, calculateDisputeAdjustment } from './queries/disputeQueries';
export { flagBookingForReview, getFraudFlags, updateFraudFlagStatus, dismissFraudFlag, confirmFraud, getFraudRiskScore } from './queries/fraudDetectionQueries';
export { createOfflineBooking, getPendingOfflineEntries, getOfflineEntryById, getOfflineEntryByLocalId, markOfflineEntrySynced, markOfflineEntrySyncing, markOfflineEntryFailed, retryOfflineSync, getOfflineEntryConflicts, resolveOfflineConflict } from './queries/offlineEntryQueries';
export { checkRoomAvailability, detectRoomConflicts, getRoomConflicts, getRoomConflictById, resolveRoomConflict, createRoomHold, releaseRoomHold, getRoomHolds } from './queries/roomConflictQueries';

export { createUserPropertyAccess, getUserPropertyAccess, getUserPropertyAccessById, getAllUserPropertyAccess, updateUserPropertyAccess, upsertUserPropertyAccess, deleteUserPropertyAccess, deleteAllUserPropertyAccessForUser, deleteAllUserPropertyAccessForProperty, getUsersByProperty, getPropertiesByUser } from './queries/userPropertyAccessQueries';

export { Prisma, ExpenseCategory, RoomType, DamageType, RoomMoveReason } from '@prisma/client';

export default prisma;
