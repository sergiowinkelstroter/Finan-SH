"use server";

import argon2 from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  senha: z.string().min(1),
});

export type LoginState = { erro?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ senha: formData.get("senha") });
  if (!parsed.success) {
    return { erro: "Digite a senha." };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    const minutos = Math.ceil(rate.retryAfterMs / 60_000);
    return { erro: `Muitas tentativas. Tente novamente em ${minutos} min.` };
  }

  const hash = process.env.SHARED_PASSWORD_HASH;
  if (!hash) {
    return { erro: "Servidor sem senha configurada." };
  }

  const ok = await argon2.verify(hash, parsed.data.senha).catch(() => false);
  if (!ok) {
    return { erro: "Senha incorreta." };
  }

  resetRateLimit(ip);
  await setSessionCookie();
  redirect("/perfil");
}
