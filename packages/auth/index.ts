// packages/auth/index.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line - NextAuth type resolution across workspace package boundaries
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = (NextAuth as any)(authConfig)