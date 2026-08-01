"use client";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { excluirAporte } from "@/server/reserva-actions";

export function AporteDeleteButton({ id, descricao }: { id: number; descricao: string }) {
  return <ConfirmDeleteButton itemLabel={descricao} onConfirm={() => excluirAporte(id)} />;
}
