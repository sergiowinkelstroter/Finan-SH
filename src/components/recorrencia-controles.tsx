"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { alternarRecorrencia, excluirRecorrencia } from "@/server/recorrencias-actions";

export function RecorrenciaControles({ id, ativo, descricao }: { id: number; ativo: boolean; descricao: string }) {
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={ativo ? "Pausar" : "Reativar"}
        onClick={() =>
          start(async () => {
            try {
              await alternarRecorrencia(id, !ativo);
              toast.success(ativo ? "Recorrência pausada." : "Recorrência reativada.");
            } catch {
              toast.error("Não deu certo.");
            }
          })
        }
      >
        {ativo ? <Pause /> : <Play />}
        <span className="hidden sm:inline">{ativo ? "Pausar" : "Reativar"}</span>
      </Button>
      <ConfirmDeleteButton itemLabel={`"${descricao}"`} onConfirm={() => excluirRecorrencia(id)} />
    </>
  );
}
