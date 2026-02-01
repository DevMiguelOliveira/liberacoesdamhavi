import { z } from "zod";

// CPF validation function
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return true; // Allow empty
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, "");

  // Must have 11 digits
  if (cleanCPF.length !== 11) return false;

  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

// Format CPF as XXX.XXX.XXX-XX
export function formatCPF(cpf: string): string {
  if (!cpf) return "";
  const cleanCPF = cpf.replace(/\D/g, "");
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Liberação form schema
export const liberacaoSchema = z.object({
  nome_pessoa: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  cpf: z
    .string()
    .trim()
    .optional(),
  tipo_acesso: z.enum(["visitante", "prestador"], {
    required_error: "Selecione o tipo de acesso",
  }),
  quadra: z
    .string()
    .trim()
    .min(1, "Quadra é obrigatória")
    .max(10, "Quadra deve ter no máximo 10 caracteres"),
  lote: z
    .string()
    .trim()
    .min(1, "Lote é obrigatório")
    .max(10, "Lote deve ter no máximo 10 caracteres"),
  data_inicio: z.date({
    required_error: "Data inicial é obrigatória",
  }),
  dias_liberados: z
    .number()
    .min(1, "Mínimo de 1 dia")
    .max(365, "Máximo de 365 dias"),
  observacoes: z.string().optional(),
});

export type LiberacaoFormData = z.infer<typeof liberacaoSchema>;

// Login schema
export const loginSchema = z.object({
  login: z.string().trim().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
