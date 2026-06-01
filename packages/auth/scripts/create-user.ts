/**
 * CLI tool to create a new user in The Rooms database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx packages/auth/scripts/create-user.ts \
 *     --email "user@example.com" --name "John Doe" --role ADMIN --password "MyPass@123"
 *
 * Environment:
 *   DATABASE_URL — required (defaults to env if not set)
 */

import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { Command } from "commander"

const prisma = new PrismaClient()

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "FRONT_OFFICE", "GUEST"]),
  password: z.string().min(8).max(128),
})

function parseArgs(argv: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      result[key] = argv[i + 1] ?? undefined
      if (argv[i + 1]?.startsWith("--")) {
        result[key] = undefined
      }
    }
  }
  return result
}

async function createUserCLI() {
  const args = parseArgs(process.argv.slice(2))

  const email = args.email ?? process.env.NEW_USER_EMAIL
  const name = args.name ?? process.env.NEW_USER_NAME
  const roleStr = args.role ?? process.env.NEW_USER_ROLE ?? "GUEST"
  const password = args.password ?? process.env.NEW_USER_PASSWORD

  if (!email || !name || !password) {
    console.error(`
Usage: npx tsx packages/auth/scripts/create-user.ts \\
  --email "user@example.com" \\
  --name "John Doe" \\
  --role ADMIN \\
  --password "MyPass@123"

Or via environment variables:
  DATABASE_URL=... NEW_USER_EMAIL=... NEW_USER_NAME=... \\
  NEW_USER_ROLE=ADMIN NEW_USER_PASSWORD=... npx tsx packages/auth/scripts/create-user.ts
`)
    process.exit(1)
  }

  const parsed = userSchema.safeParse({ email, name, role: roleStr as Role, password })
  if (!parsed.success) {
    console.error("Validation error:", parsed.error.flatten())
    process.exit(1)
  }

  const { email: validEmail, name: validName, role: validRole, password: validPassword } = parsed.data

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: validEmail } })
  if (existing) {
    console.error(`✗ User with email ${validEmail} already exists (id: ${existing.id})`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(validPassword, 12)

  const user = await prisma.user.create({
    data: {
      email: validEmail,
      name: validName,
      role: validRole,
      passwordHash,
      isActive: true,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })

  console.log(`
✓ User created successfully!

  ID:       ${user.id}
  Email:    ${user.email}
  Name:     ${user.name}
  Role:     ${user.role}
  Active:   ${user.isActive}
  Created:  ${user.createdAt.toISOString()}

  Login with password: ${validPassword}
`)
}

createUserCLI()
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())