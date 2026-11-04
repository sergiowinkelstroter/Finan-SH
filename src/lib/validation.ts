import { z } from "zod";

const competenciaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/, "Competência deve ser o dia 1 do mês.");

const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const cartaoSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao cartão."),
  bandeira: z.string().trim().optional().nullable(),
  titularId: z.coerce.number().int().positive().optional().nullable(),
  limiteCents: z.coerce.number().int().nonnegative().optional().nullable(),
  diaFechamento: z.coerce.number().int().min(1).max(31),
  diaVencimento: z.coerce.number().int().min(1).max(31),
});
export type CartaoInput = z.infer<typeof cartaoSchema>;

export const atualizarParcialSchema = z.object({
  cardId: z.coerce.number().int().positive(),
  competencia: competenciaSchema,
  valorParcialCents: z.coerce.number().int().nonnegative(),
});
export type AtualizarParcialInput = z.infer<typeof atualizarParcialSchema>;

export const atualizarParciaisEmLoteSchema = z.object({
  competencia: competenciaSchema,
  itens: z.array(
    z.object({
      cardId: z.coerce.number().int().positive(),
      valorParcialCents: z.coerce.number().int().nonnegative(),
    }),
  ),
});
export type AtualizarParciaisEmLoteInput = z.infer<
  typeof atualizarParciaisEmLoteSchema
>;

export const fecharFaturaSchema = z.object({
  cardId: z.coerce.number().int().positive(),
  competencia: competenciaSchema,
  valorFechadoCents: z.coerce.number().int().nonnegative(),
});
export type FecharFaturaInput = z.infer<typeof fecharFaturaSchema>;

export const marcarFaturaPagaSchema = z.object({
  id: z.coerce.number().int().positive(),
  pagoEm: dataSchema,
});
export type MarcarFaturaPagaInput = z.infer<typeof marcarFaturaPagaSchema>;

const categoriaSchema = z.string().trim().max(40).optional().nullable();

export const compraSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  categoria: categoriaSchema,
  compartilhada: z.boolean().optional(),
  cardId: z.coerce.number().int().positive(),
  descricao: z.string().trim().min(1, "Descreva a compra."),
  valorTotalCents: z.coerce.number().int().positive("Valor precisa ser maior que zero."),
  qtdParcelas: z.coerce.number().int().min(1).max(48),
  primeiraCompetencia: competenciaSchema,
  compradorId: z.coerce.number().int().positive().optional().nullable(),
});
export type CompraInput = z.infer<typeof compraSchema>;

export const entradaSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional().nullable(),
    descricao: z.string().trim().min(1, "Descreva a entrada."),
    valorCents: z.coerce.number().int().positive("Valor precisa ser maior que zero."),
    tipo: z.enum(["fixa", "extra"]),
    competencia: competenciaSchema.optional().nullable(),
    vigenciaInicio: dataSchema.optional().nullable(),
    vigenciaFim: dataSchema.optional().nullable(),
    ativo: z.boolean().optional(),
  })
  .refine((data) => (data.tipo === "fixa" ? !data.competencia : !!data.competencia), {
    message: "Entrada extra precisa de competência; fixa não tem competência.",
    path: ["competencia"],
  });
export type EntradaInput = z.infer<typeof entradaSchema>;

export const saidaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  descricao: z.string().trim().min(1, "Descreva a saída."),
  valorCents: z.coerce.number().int().positive("Valor precisa ser maior que zero."),
  data: dataSchema,
  categoria: categoriaSchema,
  pagoPor: z.coerce.number().int().positive().optional().nullable(),
  compartilhada: z.boolean().optional(),
});
export type SaidaInput = z.infer<typeof saidaSchema>;

export const definirTetoSchema = z.object({
  competencia: competenciaSchema,
  tetoCents: z.coerce.number().int().positive("Teto precisa ser maior que zero."),
});
export type DefinirTetoInput = z.infer<typeof definirTetoSchema>;

export const aporteSchema = z.object({
  data: dataSchema,
  valorCents: z.coerce.number().int().refine((v) => v !== 0, "Informe um valor."),
  descricao: z.string().trim().optional().nullable(),
  conta: z.string().trim().optional(),
});
export type AporteInput = z.infer<typeof aporteSchema>;

export const simularReservaSchema = z.object({
  aporteMensalCents: z.coerce.number().int().nonnegative(),
  meses: z.coerce.number().int().min(1).max(120),
  taxaAA: z.coerce.number().min(0).max(1).optional(),
});
export type SimularReservaInput = z.infer<typeof simularReservaSchema>;

export const loginSchema = z.object({
  senha: z.string().min(1, "Digite a senha."),
});

export const recorrenciaSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  descricao: z.string().trim().min(1, "Descreva a recorrência."),
  valorCents: z.coerce.number().int().positive("Valor precisa ser maior que zero."),
  diaMes: z.coerce.number().int().min(1).max(31),
  categoria: categoriaSchema,
  pagoPor: z.coerce.number().int().positive().optional().nullable(),
  compartilhada: z.boolean().optional(),
  inicio: dataSchema,
  fim: dataSchema.optional().nullable(),
  ativo: z.boolean().optional(),
});
export type RecorrenciaInput = z.infer<typeof recorrenciaSchema>;

export const metaReservaSchema = z.object({
  /** 0 remove a meta. */
  metaCents: z.coerce.number().int().nonnegative(),
  /** Mês-alvo opcional, "yyyy-MM". */
  prazo: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Prazo inválido.")
    .optional()
    .nullable(),
});
export type MetaReservaInput = z.infer<typeof metaReservaSchema>;
