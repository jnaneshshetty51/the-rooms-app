// packages/db/src/queries/corporateContractQueries.ts
// Corporate contract pricing setup - Scenario 75

import prisma from '../index';
import { Prisma, ContractStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Generate a unique contract number
 */
export async function generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CNT-${year}-`;

    // Find the highest existing number for this year
    const lastContract = await prisma.corporateContract.findFirst({
        where: {
            contractNumber: { startsWith: prefix },
        },
        orderBy: { contractNumber: 'desc' },
        select: { contractNumber: true },
    });

    let nextNum = 1;
    if (lastContract) {
        const lastNum = parseInt(lastContract.contractNumber.replace(prefix, ''));
        nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

/**
 * Create a new corporate contract
 */
export async function createCorporateContract(
    corporateAccountId: string,
    data: {
        name: string;
        startDate: Date;
        endDate: Date;
        isAutoRenew?: boolean;
        discountPercent?: number;
        paymentTermsDays?: number;
        creditLimit?: number;
        guaranteedRooms?: number;
        contractDocUrl?: string;
    }
) {
    const contractNumber = await generateContractNumber();

    return prisma.corporateContract.create({
        data: {
            corporateAccountId,
            contractNumber,
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            isAutoRenew: data.isAutoRenew ?? false,
            discountPercent: new Decimal(data.discountPercent ?? 0),
            paymentTermsDays: data.paymentTermsDays ?? 30,
            creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : null,
            guaranteedRooms: data.guaranteedRooms ?? 0,
            status: 'ACTIVE',
            contractDocUrl: data.contractDocUrl,
        },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Update a corporate contract
 */
export async function updateCorporateContract(
    contractId: string,
    data: Partial<{
        name: string;
        startDate: Date;
        endDate: Date;
        isAutoRenew: boolean;
        discountPercent: number;
        paymentTermsDays: number;
        creditLimit: number;
        guaranteedRooms: number;
        status: ContractStatus;
        contractDocUrl: string;
    }>
) {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.isAutoRenew !== undefined) updateData.isAutoRenew = data.isAutoRenew;
    if (data.discountPercent !== undefined) updateData.discountPercent = new Decimal(data.discountPercent);
    if (data.paymentTermsDays !== undefined) updateData.paymentTermsDays = data.paymentTermsDays;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit ? new Decimal(data.creditLimit) : null;
    if (data.guaranteedRooms !== undefined) updateData.guaranteedRooms = data.guaranteedRooms;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.contractDocUrl !== undefined) updateData.contractDocUrl = data.contractDocUrl;

    return prisma.corporateContract.update({
        where: { id: contractId },
        data: updateData,
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Get a corporate contract by ID
 */
export async function getCorporateContract(contractId: string) {
    return prisma.corporateContract.findUnique({
        where: { id: contractId },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Get all contracts for a corporate account
 */
export async function getCorporateContracts(corporateAccountId: string) {
    return prisma.corporateContract.findMany({
        where: { corporateAccountId },
        orderBy: { createdAt: 'desc' },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Get active contracts for a property
 */
export async function getActiveContracts(propertyId?: string) {
    const now = new Date();

    const where: Record<string, unknown> = {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
    };

    if (propertyId) {
        where.corporateAccount = { propertyId };
    }

    return prisma.corporateContract.findMany({
        where,
        orderBy: { endDate: 'asc' },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Apply contract discount to a base price
 */
export async function applyContractDiscount(
    contractId: string,
    basePrice: number
): Promise<{ discountedPrice: number; discountAmount: number; contract: Awaited<ReturnType<typeof getCorporateContract>> }> {
    const contract = await getCorporateContract(contractId);

    if (!contract) {
        throw new Error('Contract not found');
    }

    if (contract.status !== 'ACTIVE') {
        throw new Error('Contract is not active');
    }

    const now = new Date();
    if (contract.startDate > now || contract.endDate < now) {
        throw new Error('Contract is not valid for current dates');
    }

    const discountPercent = Number(contract.discountPercent);
    const discountAmount = basePrice * (discountPercent / 100);
    const discountedPrice = basePrice - discountAmount;

    return {
        discountedPrice,
        discountAmount,
        contract,
    };
}

/**
 * Renew a contract with a new end date
 */
export async function renewContract(contractId: string, newEndDate: Date) {
    const contract = await getCorporateContract(contractId);

    if (!contract) {
        throw new Error('Contract not found');
    }

    if (contract.status === 'TERMINATED') {
        throw new Error('Cannot renew a terminated contract');
    }

    return prisma.corporateContract.update({
        where: { id: contractId },
        data: {
            startDate: contract.endDate,
            endDate: newEndDate,
            status: 'ACTIVE',
        },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Terminate a contract
 */
export async function terminateContract(contractId: string, reason?: string) {
    const contract = await getCorporateContract(contractId);

    if (!contract) {
        throw new Error('Contract not found');
    }

    if (contract.status === 'TERMINATED') {
        throw new Error('Contract is already terminated');
    }

    return prisma.corporateContract.update({
        where: { id: contractId },
        data: {
            status: 'TERMINATED',
        },
        include: {
            corporateAccount: true,
        },
    });
}

/**
 * Check and update expired contracts
 */
export async function updateExpiredContracts() {
    const now = new Date();

    return prisma.corporateContract.updateMany({
        where: {
            status: 'ACTIVE',
            endDate: { lt: now },
        },
        data: {
            status: 'EXPIRED',
        },
    });
}

/**
 * Get contract statistics for a corporate account
 */
export async function getContractStats(corporateAccountId: string) {
    const contracts = await prisma.corporateContract.findMany({
        where: { corporateAccountId },
    });

    const stats = {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'ACTIVE').length,
        expired: contracts.filter(c => c.status === 'EXPIRED').length,
        terminated: contracts.filter(c => c.status === 'TERMINATED').length,
        draft: contracts.filter(c => c.status === 'DRAFT').length,
        pending: contracts.filter(c => c.status === 'PENDING').length,
    };

    return stats;
}
