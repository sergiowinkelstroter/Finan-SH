"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MedidorRitmo({
  pctTeto,
  pctMes,
  diaAtual,
  estourou,
  claro = false,
}: {
  claro?: boolean;
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
      <div className={cn("relative h-3 w-full overflow-hidden rounded-full", claro ? "bg-white/20" : "bg-traco")}>
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-[600ms] ease-out",
            estourou ? "bg-rosa" : claro ? "bg-white" : "bg-gradient-to-r from-violeta to-azul",
          )}
          style={{ width: `${estourou ? 100 : largura}%` }}
        />
        <div
          className={cn("absolute top-0 h-full w-0.5", claro ? "bg-tinta/50" : "bg-tinta/40")}
          style={{ left: posicaoMarcador }}
          aria-hidden
        />
      </div>

      <div className="relative mt-1 h-4">
        <span
          className={cn("absolute -translate-x-1/2 text-[11px]", claro ? "text-white/70" : "text-muted-foreground")}
          style={{ left: posicaoMarcador }}
        >
          dia {diaAtual}
        </span>
      </div>

      <p className={cn("mt-2 text-sm", claro ? "text-white/80" : "text-muted-foreground")}>
        {Math.round(pctTeto * 100)}% do teto · {Math.round(pctMes * 100)}% do mês ·{" "}
        <span className={cn("font-medium", estourou ? (claro ? "text-white underline" : "text-rosa") : claro ? "text-white" : "text-foreground")}>
          {estourou ? "estourou o teto" : legendaRitmo}
        </span>
      </p>
    </div>
  );
}
