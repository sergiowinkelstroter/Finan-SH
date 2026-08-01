"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirSaida } from "@/server/saidas-actions";

export function SaidaDeleteButton({ id, descricao }: { id: number; descricao: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={`"${descricao}"`}
      onConfirm={() => excluirSaida(id)}
    />
  );
}
