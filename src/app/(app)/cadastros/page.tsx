import Link from "next/link";
import { Repeat, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CartaoFormDialog } from "@/components/cartao-form-dialog";
import { EntradaFormDialog } from "@/components/entrada-form-dialog";
import { RecorrenciaFormDialog } from "@/components/recorrencia-form-dialog";
import { listarCartoes } from "@/server/cartoes";
import { listarEntradas } from "@/server/entradas";
import { listarRecorrencias } from "@/server/recorrencias";
import { categoriasDeSaidas } from "@/server/saidas";
import { listarUsuarios } from "@/server/usuarios";

export default async function CadastrosPage() {
  const [cartoes, entradas, recorrencias, usuarios, usadas] = await Promise.all([
    listarCartoes(),
    listarEntradas(),
    listarRecorrencias(),
    listarUsuarios(),
    categoriasDeSaidas(),
  ]);

  const blocos = [
    {
      titulo: "Cartões",
      descricao: "Fechamento, vencimento e limite de cada cartão.",
      href: "/cartoes",
      icon: Wallet,
      qtd: cartoes.filter((c) => c.ativo).length,
      novo: <CartaoFormDialog usuarios={usuarios} />,
    },
    {
      titulo: "Entradas",
      descricao: "Salários fixos (com vigência) e entradas extras.",
      href: "/entradas",
      icon: TrendingUp,
      qtd: entradas.length,
      novo: <EntradaFormDialog usuarios={usuarios} />,
    },
    {
      titulo: "Recorrências",
      descricao: "Aluguel, internet, assinaturas — lançadas todo mês.",
      href: "/recorrencias",
      icon: Repeat,
      qtd: recorrencias.filter((r) => r.ativo).length,
      novo: <RecorrenciaFormDialog usuarios={usuarios} categorias={usadas} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Tudo que alimenta o resto do app, num lugar só.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {blocos.map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.href}>
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <Link href={b.href} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-violeta">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-base font-semibold text-foreground">
                      {b.titulo} <span className="font-sans text-sm font-normal text-muted-foreground">· {b.qtd}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">{b.descricao}</span>
                  </span>
                </Link>
                <div className="mt-auto flex gap-2">{b.novo}</div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-violeta">
                <Users className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-display text-base font-semibold text-foreground">Pessoas</span>
                <span className="text-sm text-muted-foreground">Usadas em &quot;pago por&quot;, titular e acerto.</span>
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {usuarios.map((u) => (
                <li
                  key={u.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
                >
                  <span className="size-2.5 rounded-full" style={{ background: u.cor ?? "#6c4cf0" }} />
                  {u.nome}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
