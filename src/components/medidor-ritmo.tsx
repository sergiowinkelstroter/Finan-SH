"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MedidorRitmo({
  pctTeto,
  pctMes,
  diaAtual,
  estourou,
}: {
  pctTeto: number;
  pctMes: number;
  diaAtual: number;
  estourou: boolean;
}) {
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setLargura(Math.min(pctTeto, 1) * 100);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diferenca = pctTeto - pctMes;
  const legendaRitmo =
    diferenca > 0.03 ? "acima do ritmo" : diferenca < -0.03 ? "abaixo do ritmo" : "no ritmo";

  const posicaoMarcador = `${Math.min(Math.max(pctMes, 0), 1) * 100}%`;

  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-traco">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[600ms] ease-out",
            estourou ? "bg-rosa" : "bg-gradient-to-r from-violeta to-azul",
          )}
          style={{ width: `${estourou ? 100 : largura}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-tinta/40"
          style={{ left: posicaoMarcador }}
          aria-hidden
        />
      </div>

      <div className="relative mt-1 h-4">
        <span
          className="absolute -translate-x-1/2 text-[11px] text-muted-foreground"
          style={{ left: posicaoMarcador }}
        >
          dia {diaAtual}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {Math.round(pctTeto * 100)}% do teto · {Math.round(pctMes * 100)}% do mês ·{" "}
        <span className={estourou ? "font-medium text-rosa" : "font-medium text-foreground"}>
          {estourou ? "estourou o teto" : legendaRitmo}
        </span>
      </p>
    </div>
  );
}
