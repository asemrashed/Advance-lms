import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    phone?: string;
    name: string;
    role: "super_admin" | "admin" | "instructor" | "student" | string;
    image?: string;
    sessionId?: string;
    sessionVersion?: number;
    adminPermissions?: string[];
  }

  interface Session {
    user?: {
      id?: string;
      role?: "super_admin" | "admin" | "instructor" | "student" | string;
      adminPermissions?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    sessionId?: string;
    sessionVersion?: number;
    sessionInvalid?: boolean;
    adminPermissions?: string[];
  }
}
