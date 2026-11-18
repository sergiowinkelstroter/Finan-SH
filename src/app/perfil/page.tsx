import { ChevronRight, Wallet2 } from "lucide-react";
import { listarUsuarios } from "@/server/usuarios";
import { escolherPerfil } from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuarios = await listarUsuarios();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background">
      <section className="bg-hero relative overflow-hidden px-6 pb-20 pt-14 text-center text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Wallet2 className="size-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Quem é você?</h1>
            <p className="mt-1 text-sm text-white/80">Só para saber quem registrou o quê.</p>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 flex justify-center px-4 pb-10">
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          {usuarios.map((usuario) => {
            const cor = usuario.cor ?? "#6c4cf0";
            return (
              <form
                key={usuario.id}
                action={async () => {
                  "use server";
                  await escolherPerfil(usuario.nome);
                }}
              >
                <button
                  type="submit"
                  className="group flex w-full flex-col items-center gap-3 rounded-[24px] border border-border/70 bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-violeta/40 hover:shadow-lg focus-visible:border-violeta"
                >
                  <span
                    className="flex size-20 items-center justify-center rounded-full font-display text-3xl font-semibold text-white shadow-md ring-4 ring-background"
                    style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
                  >
                    {usuario.nome.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 font-display text-base font-semibold text-foreground">
                    {usuario.nome}
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </form>
            );
          })}

          {usuarios.length === 0 && (
            <p className="col-span-2 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda. Rode o seed do banco.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
