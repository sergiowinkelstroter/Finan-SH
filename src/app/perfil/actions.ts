"use server";

import { redirect } from "next/navigation";
import { setProfile } from "@/lib/auth";

export async function escolherPerfil(nome: string) {
  await setProfile(nome);
  redirect("/");
}
