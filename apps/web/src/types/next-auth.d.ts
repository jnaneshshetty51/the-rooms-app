// Extend NextAuth session to include role from the User model

declare module "next-auth" {
  interface User {
    role: "SUPER_ADMIN" | "ADMIN" | "FRONT_OFFICE" | "GUEST";
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "SUPER_ADMIN" | "ADMIN" | "FRONT_OFFICE" | "GUEST";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "ADMIN" | "FRONT_OFFICE" | "GUEST";
  }
}
