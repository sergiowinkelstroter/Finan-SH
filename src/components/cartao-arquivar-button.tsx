"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arquivarCartao, reativarCartao } from "@/server/cartoes-actions";

export function CartaoArquivarButton({
  id,
  ativo,
}: {
  id: number;
  ativo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (ativo) {
          await arquivarCartao(id);
          toast.success("Cartão arquivado.");
        } else {
          await reativarCartao(id);
          toast.success("Cartão reativado.");
        }
      } catch {
        toast.error("Não deu certo. Tenta de novo.");
      }
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      {ativo ? <Archive /> : <ArchiveRestore />}
      {pending ? "…" : ativo ? "Arquivar" : "Reativar"}
    </Button>
  );
}
