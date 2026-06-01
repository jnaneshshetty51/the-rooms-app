declare module "next-auth" {
  export interface TheRoomsNextAuthConfig {
    providers?: import("next-auth/providers").Provider[];
    pages?: { signIn?: string; signOut?: string; error?: string };
    callbacks?: Record<string, unknown>;
    session?: { strategy?: string; maxAge?: number };
    cookies?: Record<string, { name?: string; options?: Record<string, unknown> }>;
  }
  // Re-export the actual type if available, otherwise use our interface
  export type NextAuthConfig = TheRoomsNextAuthConfig;
}
