"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <CardHeader>
        <CardTitle>Simulador</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
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

        <div className="flex justify-between gap-2 border-t border-border pt-4">
          {marcos.map((m) => (
            <div key={m} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">{m} meses</span>
              <span className="font-mono text-sm tabular text-tinta">
                {formatCents(saldos[m - 1])}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">em {saldos.length} meses</span>
            <span className="font-mono text-sm font-medium tabular text-violeta">
              {formatCents(saldos[saldos.length - 1])}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
