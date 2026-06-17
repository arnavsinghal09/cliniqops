import type { NextAuthConfig } from "next-auth";

export default {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost:true,
  providers: [], // real provider lives in auth.ts (needs Node APIs)
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, copy our custom fields off the authorize() result onto the token.
      if (user) {
        token.name = user.name;
        token.role = user.role;
        token.clinicId = user.clinicId;
        token.clinicName = user.clinicName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.name = (token.name as string | null) ?? null;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as string;
        session.user.clinicName = token.clinicName as string;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
