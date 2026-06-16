import { NextResponse } from "next/server";

import {
  createAdminSessionToken,
  clearAdminSessionCookie,
  isAdminPasswordValid,
  parseAdminSessionToken,
  sanitizeInternalPath,
  setAdminSessionCookie,
} from "@/lib/admin-auth";

function buildLoginRedirect(request: Request, nextPath: string, withError = false) {
  const url = new URL("/admin/login", request.url);
  if (withError) {
    url.searchParams.set("error", "1");
  }
  url.searchParams.set("next", sanitizeInternalPath(nextPath));
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => new FormData());
  const action = String(formData.get("action") ?? "login");
  const nextPath = sanitizeInternalPath(String(formData.get("next") ?? "/admin"));

  if (action === "logout") {
    const response = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
    clearAdminSessionCookie(response);
    return response;
  }

  const password = String(formData.get("password") ?? "");

  if (!password || !isAdminPasswordValid(password)) {
    return buildLoginRedirect(request, nextPath, true);
  }

  const token = createAdminSessionToken();
  const expiresAt = parseAdminSessionToken(token)?.expiresAt ?? Date.now() + 1000 * 60 * 60 * 24 * 7;

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  setAdminSessionCookie(response, token, expiresAt);
  return response;
}
