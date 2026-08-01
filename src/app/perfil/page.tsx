import { listarUsuarios } from "@/server/usuarios";
import { escolherPerfil } from "./actions";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuarios = await listarUsuarios();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Quem é você?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Só para saber quem registrou o quê.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {usuarios.map((usuario) => (
            <form
              key={usuario.id}
              action={async () => {
                "use server";
                await escolherPerfil(usuario.nome);
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: usuario.cor ?? "var(--violeta)" }}
                />
                <span className="font-medium text-foreground">{usuario.nome}</span>
              </button>
            </form>
          ))}

          {usuarios.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda. Rode o seed do banco.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
