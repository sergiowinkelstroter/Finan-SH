import Link from "next/link";
import { ChevronRight, FolderCog, Repeat, TrendingUp, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CartaoFormDialog } from "@/components/cartao-form-dialog";
import { EntradaFormDialog } from "@/components/entrada-form-dialog";
import { RecorrenciaFormDialog } from "@/components/recorrencia-form-dialog";
import { IconBubble, PageHeader, SectionLabel } from "@/components/ds";
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
      cor: "#6c4cf0",
      qtd: cartoes.filter((c) => c.ativo).length,
      rotuloQtd: "ativos",
      novo: <CartaoFormDialog usuarios={usuarios} />,
    },
    {
      titulo: "Entradas",
      descricao: "Salários fixos (com vigência) e entradas extras.",
      href: "/entradas",
      icon: TrendingUp,
      cor: "#0ea88c",
      qtd: entradas.length,
      rotuloQtd: "cadastradas",
      novo: <EntradaFormDialog usuarios={usuarios} />,
    },
    {
      titulo: "Recorrências",
      descricao: "Aluguel, internet, assinaturas — lançadas todo mês.",
      href: "/recorrencias",
      icon: Repeat,
      cor: "#2e6be6",
      qtd: recorrencias.filter((r) => r.ativo).length,
      rotuloQtd: "ativas",
      novo: <RecorrenciaFormDialog usuarios={usuarios} categorias={usadas} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={FolderCog} titulo="Cadastros" subtitulo="Tudo que alimenta o resto do app, num lugar só." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {blocos.map((b) => (
          <Card key={b.href} className="flex flex-col gap-4 p-5">
            <Link href={b.href} className="group flex items-start gap-3">
              <IconBubble icon={b.icon} cor={b.cor} size="lg" shape="square" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1 font-display text-base font-semibold text-foreground">
                  {b.titulo}
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="text-sm text-muted-foreground">{b.descricao}</span>
              </span>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">
                <span className="font-mono text-lg font-semibold tabular text-foreground">{b.qtd}</span> {b.rotuloQtd}
              </span>
              {b.novo}
            </div>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel>Pessoas</SectionLabel>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <IconBubble icon={Users} cor="#f59e0b" size="lg" shape="square" />
            <span className="flex flex-col">
              <span className="font-display text-base font-semibold text-foreground">Quem usa o app</span>
              <span className="text-sm text-muted-foreground">Usadas em &quot;pago por&quot;, titular do cartão e acerto.</span>
            </span>
          </div>
          <ul className="flex flex-wrap gap-3">
            {usuarios.map((u) => {
              const cor = u.cor ?? "#6c4cf0";
              return (
                <li key={u.id} className="flex items-center gap-2.5 rounded-2xl bg-muted/60 py-2 pl-2 pr-4">
                  <span
                    className="flex size-9 items-center justify-center rounded-full font-display text-sm font-semibold text-white"
                    style={{ background: cor }}
                  >
                    {u.nome.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-foreground">{u.nome}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </div>
  );
}
