import { NextRequest, NextResponse } from "next/server";
import { parsePeriodo } from "@/lib/periodo";
import { formatCentsSemSimbolo } from "@/lib/money";
import { escolha, inteiro, um } from "@/lib/search";
import { listarSaidas } from "@/server/saidas";
import { listarAportesDoPeriodo } from "@/server/reserva";
import { listarCompras } from "@/server/compras";
import { parseReaisParaCents } from "@/lib/money";

function celula(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const tipo = escolha(sp.tipo, ["saidas", "parcelas"] as const) ?? "saidas";
  const periodo = parsePeriodo(sp);

  const linhas: (string | number | null)[][] = [];
  if (tipo === "saidas") {
    const min = um(sp.min);
    const max = um(sp.max);
    const saidas = await listarSaidas(periodo, {
      q: um(sp.q),
      categoria: um(sp.categoria),
      pagoPor: inteiro(sp.pagoPor),
      min: min ? parseReaisParaCents(min) : undefined,
      max: max ? parseReaisParaCents(max) : undefined,
    });
    linhas.push(["Data", "Descrição", "Categoria", "Pago por", "Valor", "Dividido"]);
    for (const s of saidas) {
      linhas.push([s.data, s.descricao, s.categoria, s.pagador?.nome ?? "", formatCentsSemSimbolo(s.valorCents), s.compartilhada ? "sim" : "não"]);
    }
    // Reserva conta como saída na tela de Saídas; o CSV acompanha (resgate sai negativo).
    const cat = um(sp.categoria);
    if ((!cat || cat === "Reserva") && !sp.pagoPor) {
      const q = um(sp.q)?.toLocaleLowerCase("pt-BR");
      for (const a of await listarAportesDoPeriodo(periodo)) {
        const desc = a.descricao || (a.valorCents >= 0 ? "Guardado na reserva" : "Resgate da reserva");
        if (q && !desc.toLocaleLowerCase("pt-BR").includes(q)) continue;
        linhas.push([a.data, desc, "Reserva", "", formatCentsSemSimbolo(a.valorCents), "sim"]);
      }
    }
  } else {
    const compras = await listarCompras(periodo, {
      q: um(sp.q),
      cardId: inteiro(sp.cartao),
      compradorId: inteiro(sp.comprador),
      categoria: um(sp.categoria),
      status: escolha(sp.status, ["ativas", "quitadas", "todas"] as const),
      tipo: escolha(sp.compra, ["parceladas", "avista", "todas"] as const) ?? "parceladas",
    });
    linhas.push(["Descrição", "Cartão", "Comprador", "Categoria", "Total", "Parcelas", "No período", "Restante"]);
    for (const c of compras) {
      linhas.push([
        c.descricao,
        c.card.nome,
        c.comprador?.nome ?? "",
        c.categoria,
        formatCentsSemSimbolo(c.valorTotalCents),
        c.qtdParcelas,
        formatCentsSemSimbolo(c.noPeriodoCents),
        formatCentsSemSimbolo(c.restanteCents),
      ]);
    }
  }

  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}-${periodo.de}_${periodo.ate}.csv"`,
    },
  });
}
