"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirCompra } from "@/server/compras-actions";

export function CompraDeleteButton({ id, descricao }: { id: number; descricao: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={`"${descricao}"`}
      onConfirm={() => excluirCompra(id)}
    />
  );
}
