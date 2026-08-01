"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirEntrada } from "@/server/entradas-actions";

export function EntradaDeleteButton({ id, descricao }: { id: number; descricao: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={`"${descricao}"`}
      onConfirm={() => excluirEntrada(id)}
    />
  );
}
