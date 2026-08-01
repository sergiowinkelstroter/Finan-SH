export const SESSION_COOKIE_NAME = "session";
export const PROFILE_COOKIE_NAME = "perfil";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não está definida.");
  }
  return new TextEncoder().encode(secret);
}
