import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { canUserLogin } from "@/lib/accountStatus";
import { getDisplayName } from "@/lib/displayName";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import {
  checkDeviceLimitForUser,
  consumeVerifiedDeviceLoginChallenge,
  parseDeviceLabel,
  upsertDeviceSessionForLogin,
  validateDeviceSession,
} from "@/lib/deviceSessions";
import { isDeviceLimitSystemEnabled } from "@/lib/deviceSessionConfig";
import type { AppRole } from "@/app/api/_lib/phase12";
import { resolveAdminPermissions } from "@/lib/adminPermissions";
import { isAdminAreaRole } from "@/lib/roles";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        deviceId: { label: "Device ID", type: "text" },
        userAgent: { label: "User Agent", type: "text" },
        deviceLoginToken: { label: "Device Login Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        if (!isValidEmail(email)) {
          return null;
        }

        const deviceId = String(credentials.deviceId || "").trim();
        const userAgent = String(credentials.userAgent || "").trim();
        const deviceLoginToken = String(credentials.deviceLoginToken || "").trim();
        const deviceLabel = parseDeviceLabel(userAgent);

        try {
          await connectDB();

          const user = await User.findOne({ email });

          if (!user) {
            return null;
          }

          if (
            !canUserLogin({
              accountStatus: user.accountStatus,
              isActive: user.isActive,
              role: user.role,
            })
          ) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (!isPasswordValid) {
            return null;
          }

          const userId = user._id.toString();
          const role = user.role as AppRole;
          let sessionId: string | undefined;

          if (isDeviceLimitSystemEnabled() && !isAdminAreaRole(role)) {
            if (!deviceId) {
              return null;
            }

            if (deviceLoginToken) {
              const challenge = await consumeVerifiedDeviceLoginChallenge(
                deviceLoginToken,
                userId,
              );
              if (!challenge) {
                return null;
              }

              sessionId = await upsertDeviceSessionForLogin({
                userId,
                deviceId: challenge.deviceId,
                deviceLabel: challenge.deviceLabel,
                userAgent: challenge.userAgent,
              });
            } else {
              const limitCheck = await checkDeviceLimitForUser(
                userId,
                role,
                deviceId,
              );
              if (!limitCheck.allowed) {
                return null;
              }

              sessionId = await upsertDeviceSessionForLogin({
                userId,
                deviceId,
                deviceLabel,
                userAgent,
              });
            }
          }

          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          const refreshedUser = await User.findById(user._id)
            .select("sessionVersion adminPermissions")
            .lean();

          const userData = {
            id: userId,
            email: user.email,
            phone: user.phone,
            name: getDisplayName(user, user.email),
            role: user.role,
            image: user.avatar,
            sessionId,
            sessionVersion: refreshedUser?.sessionVersion ?? 0,
            adminPermissions: resolveAdminPermissions(
              refreshedUser?.adminPermissions,
              { role: user.role },
            ),
          };

          return userData;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          role?: unknown;
          sessionId?: string;
          sessionVersion?: number;
          adminPermissions?: string[];
        };
        token.role = authUser.role as string | undefined;
        token.sessionId = authUser.sessionId;
        token.sessionVersion = authUser.sessionVersion ?? 0;
        token.adminPermissions = authUser.adminPermissions ?? [];
        token.sessionInvalid = false;
        return token;
      }

      if (
        isDeviceLimitSystemEnabled() &&
        token.sub &&
        !isAdminAreaRole(token.role)
      ) {
        if (!token.sessionId) {
          token.sessionInvalid = true;
          return token;
        }

        const valid = await validateDeviceSession(
          token.sub,
          token.sessionId as string | undefined,
          token.sessionVersion as number | undefined,
        );
        token.sessionInvalid = !valid;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sessionInvalid) {
        return {
          ...session,
          user: undefined,
          expires: new Date(0).toISOString(),
        };
      }

      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.adminPermissions = Array.isArray(token.adminPermissions)
          ? token.adminPermissions
          : [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: (process.env.NEXTAUTH_SECRET || "").trim() || undefined,
};
