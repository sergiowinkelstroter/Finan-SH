import {
  BarChart3,
  CreditCard,
  Home,
  Layers,
  LineChart,
  PiggyBank,
  Receipt,
  Repeat,
  TrendingUp,
  Wallet,
  FolderCog,
  Table2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const GRUPOS_NAV: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: "Visão geral",
    itens: [
      { href: "/", label: "Início", icon: Home },
      { href: "/fluxo", label: "Para onde vai", icon: Workflow },
      { href: "/analises", label: "Análises", icon: BarChart3 },
    ],
  },
  {
    titulo: "Futuro",
    itens: [
      { href: "/planilha", label: "Planilha do futuro", icon: Table2 },
      { href: "/projecao", label: "Projeção", icon: LineChart },
    ],
  },
  {
    titulo: "Lançamentos",
    itens: [
      { href: "/faturas", label: "Faturas", icon: CreditCard },
      { href: "/parcelas", label: "Parcelas", icon: Layers },
      { href: "/saidas", label: "Saídas", icon: Receipt },
      { href: "/entradas", label: "Entradas", icon: TrendingUp },
      { href: "/reserva", label: "Reserva", icon: PiggyBank },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/cartoes", label: "Cartões", icon: Wallet },
      { href: "/recorrencias", label: "Recorrências", icon: Repeat },
      { href: "/cadastros", label: "Todos os cadastros", icon: FolderCog },
    ],
  },
];

/** Abas fixas do celular; o resto vai em "Mais". */
export const ABAS_MOBILE = ["/", "/saidas", "/planilha"];

/** Rótulos curtos para a barra inferior do celular. */
export const ROTULO_CURTO: Record<string, string> = {
  "/": "Início",
  "/saidas": "Saídas",
  "/planilha": "Futuro",
};

export const TODOS_ITENS = GRUPOS_NAV.flatMap((g) => g.itens);

export function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
