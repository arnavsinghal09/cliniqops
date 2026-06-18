export const DEMO_CREDENTIALS = {
  email: "admin@sunrise.com",
  password: "password123",
  clinicSlug: "sunrise",
} as const;

export type DemoCredentials = typeof DEMO_CREDENTIALS;
