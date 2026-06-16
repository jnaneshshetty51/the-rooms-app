// packages/db/src/queries/corporateAccountQueries.ts
// Corporate Account CRUD operations and credit management

import { Prisma } from '@prisma/client';
import { prisma } from '../index';

// ─── Types ────────────────────────────────────────────────────────────────────────

export interface CreateCorporateAccountData {
    companyName: string;
    companyGstin?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentTermsDays?: number;
    creditLimit?: number;
    discountPercent?: number;
    isActive?: boolean;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingPincode?: string;
}

export interface UpdateCorporateAccountData {
    companyName?: string;
    companyGstin?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentTermsDays?: number;
    creditLimit?: number;
    discountPercent?: number;
    isActive?: boolean;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingPincode?: string;
}

export type CorporateAccountWithUsage = Awaited<ReturnType<typeof getCorporateAccount>> & {
    currentUsage: number;
    availableCredit: number;
};

// ─── Create Corporate Account ─────────────────────────────────────────────────

export async function createCorporateAccount(data: CreateCorporateAccountData) {
    return prisma.corporateAccount.create({
        data: {
            companyName: data.companyName,
            companyGstin: data.companyGstin,
            contactName: data.contactName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            paymentTermsDays: data.paymentTermsDays ?? 30,
            creditLimit: data.creditLimit ? new Prisma.Decimal(data.creditLimit) : null,
            discountPercent: data.discountPercent ? new Prisma.Decimal(data.discountPercent) : null,
            isActive: data.isActive ?? true,
            billingAddress: data.billingAddress,
            billingCity: data.billingCity,
            billingState: data.billingState,
            billingPincode: data.billingPincode,
        },
    });
}

// ─── Get Corporate Account ─────────────────────────────────────────────────────

export async function getCorporateAccount(id: string) {
    return prisma.corporateAccount.findUnique({
        where: { id },
        include: {
            // Include active bookings using corporate credit
            bookings: {
                where: {
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    corporateAccountId: id,
                },
                select: {
                    id: true,
                    bookingNumber: true,
                    totalAmount: true,
                    checkIn: true,
                    checkOut: true,
                    status: true,
                },
            },
        },
    });
}

// ─── Get Corporate Account by Company Name ─────────────────────────────────────

export async function getCorporateAccountByName(companyName: string) {
    return prisma.corporateAccount.findFirst({
        where: {
            companyName: {
                equals: companyName,
                mode: 'insensitive',
            },
        },
    });
}

// ─── List Corporate Accounts ───────────────────────────────────────────────────

export async function listCorporateAccounts(options: {
    isActive?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const { isActive, search, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CorporateAccountWhereInput = {};

    if (isActive !== undefined) {
        where.isActive = isActive;
    }

    if (search) {
        where.OR = [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactEmail: { contains: search, mode: 'insensitive' } },
            { contactPhone: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [accounts, total] = await Promise.all([
        prisma.corporateAccount.findMany({
            where,
            orderBy: { companyName: 'asc' },
            skip,
            take: pageSize,
        }),
        prisma.corporateAccount.count({ where }),
    ]);

    return {
        accounts,
        pagination: {
            page,
            pageSize,
            total,
            pages: Math.ceil(total / pageSize),
        },
    };
}

// ─── Update Corporate Account ─────────────────────────────────────────────────

export async function updateCorporateAccount(id: string, data: UpdateCorporateAccountData) {
    const updateData: Prisma.CorporateAccountUpdateInput = {};

    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.companyGstin !== undefined) updateData.companyGstin = data.companyGstin;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.paymentTermsDays !== undefined) updateData.paymentTermsDays = data.paymentTermsDays;
    if (data.creditLimit !== undefined) updateData.creditLimit = new Prisma.Decimal(data.creditLimit);
    if (data.discountPercent !== undefined) updateData.discountPercent = new Prisma.Decimal(data.discountPercent);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.billingCity !== undefined) updateData.billingCity = data.billingCity;
    if (data.billingState !== undefined) updateData.billingState = data.billingState;
    if (data.billingPincode !== undefined) updateData.billingPincode = data.billingPincode;

    return prisma.corporateAccount.update({
        where: { id },
        data: updateData,
    });
}

// ─── Get Corporate Credit Usage ────────────────────────────────────────────────

export async function getCorporateCreditUsage(corporateAccountId: string): Promise<number> {
    const result = await prisma.booking.aggregate({
        where: {
            corporateAccountId: corporateAccountId,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        _sum: {
            totalAmount: true,
        },
    });

    return result._sum.totalAmount?.toNumber() ?? 0;
}

// ─── Validate Corporate Credit ─────────────────────────────────────────────────

export async function validateCorporateCredit(
    corporateAccountId: string,
    amount: number
): Promise<{ valid: boolean; availableCredit: number; currentUsage: number; error?: string }> {
    const account = await prisma.corporateAccount.findUnique({
        where: { id: corporateAccountId },
    });

    if (!account) {
        return {
            valid: false,
            availableCredit: 0,
            currentUsage: 0,
            error: 'CORPORATE_ACCOUNT_NOT_FOUND',
        };
    }

    if (!account.isActive) {
        return {
            valid: false,
            availableCredit: 0,
            currentUsage: 0,
            error: 'CORPORATE_ACCOUNT_INACTIVE',
        };
    }

    const currentUsage = await getCorporateCreditUsage(corporateAccountId);
    const creditLimit = account.creditLimit?.toNumber() ?? 0;
    const availableCredit = creditLimit - currentUsage;

    if (creditLimit > 0 && amount > availableCredit) {
        return {
            valid: false,
            availableCredit,
            currentUsage,
            error: 'CREDIT_LIMIT_EXCEEDED',
        };
    }

    return {
        valid: true,
        availableCredit,
        currentUsage,
    };
}

// ─── Update Credit Balance (after payment) ─────────────────────────────────────

export async function updateCreditBalance(
    corporateAccountId: string,
    amount: number,
    operation: 'ADD' | 'DEDUCT'
): Promise<void> {
    // This function is called when a corporate invoice is paid
    // In a real implementation, you might track this in a separate corporate_transactions table
    // For now, we just validate the credit is available

    const account = await prisma.corporateAccount.findUnique({
        where: { id: corporateAccountId },
    });

    if (!account) {
        throw new Error('CORPORATE_ACCOUNT_NOT_FOUND');
    }

    const currentUsage = await getCorporateCreditUsage(corporateAccountId);
    const creditLimit = account.creditLimit?.toNumber() ?? 0;

    if (operation === 'DEDUCT') {
        const newUsage = currentUsage - amount;
        if (newUsage < 0) {
            throw new Error('INVALID_CREDIT_OPERATION');
        }
    } else {
        const newUsage = currentUsage + amount;
        if (creditLimit > 0 && newUsage > creditLimit) {
            throw new Error('CREDIT_LIMIT_EXCEEDED');
        }
    }
}

// ─── Get Corporate Account with Full Details ───────────────────────────────────

export async function getCorporateAccountFullDetails(id: string) {
    const account = await prisma.corporateAccount.findUnique({
        where: { id },
        include: {
            bookings: {
                where: {
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                },
                orderBy: { checkIn: 'desc' },
                take: 10,
                select: {
                    id: true,
                    bookingNumber: true,
                    checkIn: true,
                    checkOut: true,
                    status: true,
                    totalAmount: true,
                    guest: {
                        select: {
                            name: true,
                            phone: true,
                        },
                    },
                },
            },
        },
    });

    if (!account) {
        return null;
    }

    const currentUsage = await getCorporateCreditUsage(id);
    const creditLimit = account.creditLimit?.toNumber() ?? 0;

    return {
        ...account,
        currentUsage,
        availableCredit: creditLimit > 0 ? creditLimit - currentUsage : null,
        creditLimit,
    };
}

// ─── Delete Corporate Account (soft delete by setting inactive) ─────────────────

export async function deleteCorporateAccount(id: string): Promise<boolean> {
    // Check if there are active bookings
    const activeBookings = await prisma.booking.count({
        where: {
            corporateAccountId: id,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
    });

    if (activeBookings > 0) {
        throw new Error('CANNOT_DELETE_ACCOUNT_WITH_ACTIVE_BOOKINGS');
    }

    // Soft delete by setting inactive
    await prisma.corporateAccount.update({
        where: { id },
        data: { isActive: false },
    });

    return true;
}
