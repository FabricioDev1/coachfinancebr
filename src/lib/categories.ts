import { colorOf } from "@/lib/card-colors";
import type { FinanceCategory } from "@/lib/finance-data";

export const CATEGORY_NAME_MAX = 40;

export const categoryKindOptions = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "both", label: "Despesa e receita" },
] as const;

export function categoryKindLabel(kind: string) {
  return categoryKindOptions.find((o) => o.value === kind)?.label ?? "Despesa";
}

/** Remove espaços extras: "  Pets   e  Vet " -> "Pets e Vet" */
export function normalizeCategoryName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** Comparação sem acento e sem caixa: "Saude" == "saúde" */
export function foldName(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

export function categoryNameError(name: string, list: FinanceCategory[], ignoreId?: string) {
  if (!name) return "Informe um nome.";
  if (name.length > CATEGORY_NAME_MAX) return `Use no máximo ${CATEGORY_NAME_MAX} caracteres.`;
  if (list.some((c) => c.id !== ignoreId && foldName(c.name) === foldName(name))) {
    return "Já existe uma categoria com esse nome.";
  }
  return "";
}

export function sortCategories(list: FinanceCategory[]) {
  return [...list].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
}

/** Categorias disponíveis para um tipo de lançamento. */
export function categoriesFor(kind: "expense" | "income", list: FinanceCategory[]) {
  return list.filter((c) => c.kind === "both" || c.kind === kind);
}

export function nextSortOrder(list: FinanceCategory[]) {
  const regular = list.filter((c) => !c.is_system).map((c) => c.sort_order);
  return Math.min(98, (regular.length ? Math.max(...regular) : 0) + 1);
}

export function categoryColor(name: string, list: FinanceCategory[]) {
  return colorOf(list.find((c) => c.name === name)?.color ?? "brand");
}

export function systemCategory(list: FinanceCategory[]) {
  return list.find((c) => c.is_system) ?? list.find((c) => foldName(c.name) === "outros") ?? null;
}

export function categoryErrorMessage(error: unknown) {
  const e = (error ?? {}) as { code?: string; message?: string };
  const msg = e.message ?? "";
  if (e.code === "23505" || msg.includes("categories_user_name_uidx")) return "Já existe uma categoria com esse nome.";
  if (msg.includes("CATEGORY_IN_USE")) return "Esta categoria tem lançamentos. Escolha para onde transferi-los antes de excluir.";
  if (msg.includes("CATEGORY_SYSTEM")) return "A categoria \"Outros\" é padrão: pode mudar a cor, mas não pode ser renomeada nem excluída.";
  if (msg.includes("CATEGORY_SAME")) return "Escolha uma categoria de destino diferente da origem.";
  if (msg.includes("CATEGORY_NOT_FOUND")) return "Categoria não encontrada. Atualize a página e tente de novo.";
  if (msg.startsWith("Aguarde") || msg === "Informe um nome." || msg.startsWith("Use no máximo") || msg === "Já existe uma categoria com esse nome.") return msg;
  return "Não foi possível concluir. Tente novamente.";
}
