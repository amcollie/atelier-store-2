// Client-side checks for the sign-in and sign-up forms. They mirror Better
// Auth's own limits (src/lib/auth.ts), which still validate on the server.

export type AuthMode = "sign-in" | "sign-up";
export type AuthField = "name" | "email" | "password";
export type AuthValues = Record<AuthField, string>;
export type FieldErrors = Partial<Record<AuthField, string>>;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128; // Better Auth's default maxPasswordLength

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(mode: AuthMode, field: AuthField, value: string): string | undefined {
  switch (field) {
    case "name":
      if (mode === "sign-up" && !value.trim()) return "Enter your name.";
      return undefined;
    case "email":
      if (!value.trim()) return "Enter your email address.";
      if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address, like name@example.com.";
      return undefined;
    case "password":
      if (!value) return mode === "sign-up" ? "Choose a password." : "Enter your password.";
      if (mode === "sign-up" && value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
      if (value.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
      return undefined;
  }
}

export function fieldsFor(mode: AuthMode): AuthField[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

export function validateAll(mode: AuthMode, values: AuthValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldsFor(mode)) {
    const error = validateField(mode, field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
