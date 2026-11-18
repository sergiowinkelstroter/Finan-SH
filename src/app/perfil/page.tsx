import { ChevronRight, Wallet2 } from "lucide-react";
import { listarUsuarios } from "@/server/usuarios";
import { escolherPerfil } from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuarios = await listarUsuarios();

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background">
      <section className="px-6 pb-8 pt-16 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-violeta text-white shadow-md shadow-violeta/25">
            <Wallet2 className="size-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Quem é você?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Só para saber quem registrou o quê.</p>
          </div>
        </div>
      </section>

      <section className="flex justify-center px-4 pb-10">
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
                    className="flex size-20 items-center justify-center rounded-full font-display text-3xl font-semibold text-white shadow-sm"
                    style={{ background: cor }}
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
