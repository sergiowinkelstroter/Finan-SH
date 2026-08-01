import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { getProjecao } from "@/server/projecao";

export default async function ProjecaoPage() {
  const linhas = await getProjecao(12);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">
        Projeção — 12 meses
      </h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            <TableHead className="text-right">Entradas</TableHead>
            <TableHead className="text-right">Comprometido</TableHead>
            <TableHead className="text-right">Teto</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={linha.competencia}>
              <TableCell className="font-medium capitalize text-foreground">
                {linha.label}
              </TableCell>
              <TableCell className="text-right font-mono tabular">
                {formatCents(linha.entradasCents)}
              </TableCell>
              <TableCell className="text-right font-mono tabular text-bruma">
                ~{formatCents(linha.comprometidoCents)}
              </TableCell>
              <TableCell className="text-right font-mono tabular">
                {formatCents(linha.tetoCents)}
              </TableCell>
              <TableCell
                className={`text-right font-mono tabular font-medium ${
                  linha.saldoProjetadoCents < 0 ? "text-rosa" : "text-menta"
                }`}
              >
                {formatCents(linha.saldoProjetadoCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
