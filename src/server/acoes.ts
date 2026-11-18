import "server-only";

import { CATEGORIAS_PADRAO } from "@/lib/categorias";
import type { DadosAcoes } from "@/components/acoes-rapidas";
import { listarCartoes } from "./cartoes";
import { categoriasDeCompras } from "./compras";
import { categoriasDeSaidas } from "./saidas";
import { listarUsuarios } from "./usuarios";

/** Dados mínimos para os formulários de lançamento rápido (FAB e atalhos). */
export async function getDadosAcoes(): Promise<DadosAcoes> {
  const [usuarios, cartoes, catSaidas, catCompras] = await Promise.all([
    listarUsuarios(),
    listarCartoes({ soAtivos: true }),
    categoriasDeSaidas(),
    categoriasDeCompras(),
  ]);
  return {
    usuarios: usuarios.map((u) => ({ id: u.id, nome: u.nome })),
    cartoes: cartoes.map((c) => ({ id: c.id, nome: c.nome })),
    categorias: [...new Set([...catSaidas, ...catCompras])].filter(
      (c) => !(CATEGORIAS_PADRAO as readonly string[]).includes(c),
    ),
  };
}
