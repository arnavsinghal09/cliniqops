import "next-auth";
declare module "next-auth" {
  interface User {
    name?: string | null;
    role?: string;
    clinicId?: string;
    clinicName?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      clinicId: string;
      clinicName: string;
    };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    name?: string | null;
    role?: string;
    clinicId?: string;
    clinicName?: string;
  }
}
