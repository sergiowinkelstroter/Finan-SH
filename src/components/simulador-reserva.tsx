"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBubble } from "@/components/ds";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projecaoReserva } from "@/lib/calculos";
import { formatCents, parseReaisParaCents } from "@/lib/money";

export function SimuladorReserva({ saldoInicialCents }: { saldoInicialCents: number }) {
  const [aporteMensal, setAporteMensal] = useState("500,00");
  const [meses, setMeses] = useState("12");
  const [taxaAA, setTaxaAA] = useState("0");

  const saldos = useMemo(() => {
    const aporteMensalCents = parseReaisParaCents(aporteMensal);
    const mesesNum = Math.max(1, Math.min(120, Number(meses) || 0));
    const taxaAANum = Math.max(0, Number(taxaAA.replace(",", ".")) || 0) / 100;

    return projecaoReserva({
      saldoInicialCents,
      aporteMensalCents,
      meses: mesesNum,
      taxaAA: taxaAANum,
    });
  }, [saldoInicialCents, aporteMensal, meses, taxaAA]);

  const marcos = [6, 12, 24].filter((m) => m <= saldos.length);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <IconBubble icon={Calculator} size="sm" />
        <div>
          <CardTitle>Simulador</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Quanto a reserva vira guardando todo mês.</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aporteMensal">Aporte/mês</Label>
            <Input
              id="aporteMensal"
              inputMode="decimal"
              className="font-mono tabular"
              value={aporteMensal}
              onChange={(e) => setAporteMensal(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meses">Meses</Label>
            <Input
              id="meses"
              type="number"
              min={1}
              max={120}
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxaAA">Rende % a.a.</Label>
            <Input
              id="taxaAA"
              inputMode="decimal"
              value={taxaAA}
              onChange={(e) => setTaxaAA(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {marcos.map((m) => (
            <div key={m} className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-3">
              <span className="text-xs text-muted-foreground">{m} meses</span>
              <span className="font-mono text-sm font-semibold tabular text-tinta">
                {formatCents(saldos[m - 1])}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-1 rounded-2xl bg-violeta/10 p-3">
            <span className="text-xs text-violeta/80">em {saldos.length} meses</span>
            <span className="font-mono text-sm font-semibold tabular text-violeta">
              {formatCents(saldos[saldos.length - 1])}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
