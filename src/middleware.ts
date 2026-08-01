import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import {
  PROFILE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getAuthSecret,
} from "@/lib/auth-constants";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/manifest") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, getAuthSecret());
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (
    pathname !== "/perfil" &&
    !request.cookies.get(PROFILE_COOKIE_NAME)?.value
  ) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
