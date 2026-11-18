import {
  BookOpen,
  Car,
  CircleHelp,
  CreditCard,
  Dog,
  Film,
  Gift,
  HeartPulse,
  Home,
  type LucideIcon,
  Plane,
  PiggyBank,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tv,
  Utensils,
  Wallet,
  Zap,
  Baby,
  Dumbbell,
  GraduationCap,
  Fuel,
  Shirt,
} from "lucide-react";
import { CARTAO_SEM_CATEGORIA, RESERVA, LIVRE, SEM_CATEGORIA } from "./categorias";

const FIXOS: Record<string, LucideIcon> = {
  Moradia: Home,
  Mercado: ShoppingCart,
  Restaurantes: Utensils,
  Transporte: Car,
  Saúde: HeartPulse,
  Lazer: Film,
  Assinaturas: Tv,
  Educação: BookOpen,
  Compras: ShoppingBag,
  Viagem: Plane,
  Pets: Dog,
  Outros: Sparkles,
  [SEM_CATEGORIA]: CircleHelp,
  [CARTAO_SEM_CATEGORIA]: CreditCard,
  [RESERVA]: PiggyBank,
  [LIVRE]: Wallet,
};

/** Palavras-chave para categorias criadas pelo casal. */
const PALAVRAS: [RegExp, LucideIcon][] = [
  [/luz|energia|água|agua|g[aá]s|conta/i, Zap],
  [/celular|internet|telefone|tel/i, Smartphone],
  [/academia|esporte|gym/i, Dumbbell],
  [/escola|faculdade|curso/i, GraduationCap],
  [/combust|gasolina|posto/i, Fuel],
  [/roupa|vestu/i, Shirt],
  [/beb[eê]|filh/i, Baby],
  [/presente/i, Gift],
  [/imposto|taxa|iptu|ipva/i, Receipt],
  [/aluguel|condom/i, Home],
  [/mercado|feira/i, ShoppingCart],
  [/ifood|delivery|lanche|comida/i, Utensils],
];

export function iconeCategoria(nome: string | null | undefined): LucideIcon {
  if (!nome) return CircleHelp;
  if (FIXOS[nome]) return FIXOS[nome];
  for (const [re, icon] of PALAVRAS) if (re.test(nome)) return icon;
  return Sparkles;
}
