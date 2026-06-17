import prisma from '../index';
import { PropertyRole } from '@prisma/client';

/**
 * ─── User Property Access Queries ─────────────────────────────────────────────
 *
 * Functions for managing user access to properties:
 * - createUserPropertyAccess
 * - getUserPropertyAccess
 * - updateUserPropertyAccess
 * - deleteUserPropertyAccess
 * - getUserPropertyAccessById
 * - getUsersByProperty
 * - getPropertiesByUser
 */

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateUserPropertyAccessData {
    userId: string;
    propertyId: string;
    role?: PropertyRole;
}

/**
 * Create a new user property access record
 * Throws if the user already has access to this property (unique constraint)
 */
export async function createUserPropertyAccess(data: CreateUserPropertyAccessData) {
    return prisma.userPropertyAccess.create({
        data: {
            userId: data.userId,
            propertyId: data.propertyId,
            role: data.role || PropertyRole.VIEWER,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get all property access records for a user
 */
export async function getPropertiesByUser(userId: string) {
    return prisma.userPropertyAccess.findMany({
        where: { userId },
        include: {
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    isActive: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get all users with access to a property
 */
export async function getUsersByProperty(propertyId: string) {
    return prisma.userPropertyAccess.findMany({
        where: { propertyId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get a single user property access record by ID
 */
export async function getUserPropertyAccessById(id: string) {
    return prisma.userPropertyAccess.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    isActive: true,
                },
            },
        },
    });
}

/**
 * Get a single user property access record by userId and propertyId
 */
export async function getUserPropertyAccess(userId: string, propertyId: string) {
    return prisma.userPropertyAccess.findUnique({
        where: {
            userId_propertyId: {
                userId,
                propertyId,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    isActive: true,
                },
            },
        },
    });
}

/**
 * Get all user property access records (with optional filters)
 */
export async function getAllUserPropertyAccess(options?: {
    where?: {
        userId?: string;
        propertyId?: string;
        role?: PropertyRole;
    };
    include?: {
        user?: boolean;
        property?: boolean;
    };
}) {
    const where = options?.where || {};
    const include = {
        user: options?.include?.user !== false ? {
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        } : false,
        property: options?.include?.property !== false ? {
            select: {
                id: true,
                name: true,
                code: true,
                city: true,
                isActive: true,
            },
        } : false,
    };

    return prisma.userPropertyAccess.findMany({
        where,
        include: include as { user: true; property: true },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateUserPropertyAccessData {
    role?: PropertyRole;
}

/**
 * Update a user property access record
 */
export async function updateUserPropertyAccess(id: string, data: UpdateUserPropertyAccessData) {
    return prisma.userPropertyAccess.update({
        where: { id },
        data,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    isActive: true,
                },
            },
        },
    });
}

/**
 * Update or create user property access (upsert)
 */
export async function upsertUserPropertyAccess(data: CreateUserPropertyAccessData) {
    return prisma.userPropertyAccess.upsert({
        where: {
            userId_propertyId: {
                userId: data.userId,
                propertyId: data.propertyId,
            },
        },
        update: {
            role: data.role || PropertyRole.VIEWER,
        },
        create: {
            userId: data.userId,
            propertyId: data.propertyId,
            role: data.role || PropertyRole.VIEWER,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            property: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    city: true,
                    isActive: true,
                },
            },
        },
    });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a user property access record
 */
export async function deleteUserPropertyAccess(id: string) {
    return prisma.userPropertyAccess.delete({
        where: { id },
    });
}

/**
 * Delete all property access for a user
 */
export async function deleteAllUserPropertyAccessForUser(userId: string) {
    return prisma.userPropertyAccess.deleteMany({
        where: { userId },
    });
}

/**
 * Delete all users' access to a property
 */
export async function deleteAllUserPropertyAccessForProperty(propertyId: string) {
    return prisma.userPropertyAccess.deleteMany({
        where: { propertyId },
    });
}
