import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  PROFILE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getAuthSecret,
} from "./auth-constants";

export async function createSessionToken() {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function setSessionCookie() {
  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  store.delete(PROFILE_COOKIE_NAME);
}

export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getAuthSecret());
    return true;
  } catch {
    return false;
  }
}

export async function getProfile(): Promise<string | null> {
  const store = await cookies();
  return store.get(PROFILE_COOKIE_NAME)?.value ?? null;
}

export async function setProfile(nome: string) {
  const store = await cookies();
  store.set(PROFILE_COOKIE_NAME, nome, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
