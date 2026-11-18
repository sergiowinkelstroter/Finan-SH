import { FileUp } from "lucide-react";
import { ImportadorExtrato } from "@/components/importador-extrato";
import { RegrasCategorizacao } from "@/components/regras-categorizacao";
import { PageHeader } from "@/components/page-header";
import { CATEGORIAS_PADRAO } from "@/lib/categorias";
import { competenciaAtualISO } from "@/lib/dates";
import { listarCartoes } from "@/server/cartoes";
import { categoriasDeCompras } from "@/server/compras";
import { listarRegras } from "@/server/importacao";
import { categoriasDeSaidas } from "@/server/saidas";
import { listarUsuarios } from "@/server/usuarios";

export default async function ImportarPage() {
  const [cartoes, usuarios, catSaidas, catCompras, regras] = await Promise.all([
    listarCartoes({ soAtivos: true }),
    listarUsuarios(),
    categoriasDeSaidas(),
    categoriasDeCompras(),
    listarRegras(),
  ]);
  const categorias = [...new Set([...CATEGORIAS_PADRAO, ...catSaidas, ...catCompras])];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={FileUp}
        titulo="Importar extrato"
        subtitulo="Suba a fatura ou o extrato do banco: cada compra vira lançamento já categorizado."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <ImportadorExtrato
          cartoes={cartoes.map((c) => ({ id: c.id, nome: c.nome }))}
          usuarios={usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
          categorias={categorias}
          competenciaAtual={competenciaAtualISO()}
        />
        <aside className="xl:sticky xl:top-6">
          <RegrasCategorizacao regras={regras} categorias={categorias} />
        </aside>
      </div>
    </div>
  );
}
