import type { CnaeDivisionMapping } from "../types/cnae.types";

const CNAE_DIVISION_LENGTH = 2;

function isCnaeDivisionMapping(
  value: unknown,
): value is CnaeDivisionMapping {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([division, description]) =>
      /^\d{2}$/.test(division) &&
      typeof description === "string" &&
      description.trim().length > 0,
  );
}

async function loadCnaeDivisionMap(): Promise<Map<string, string>> {
  const payload: unknown = await Bun.file(
    "./src/mappings/mapCnaes.json",
  ).json();

  if (!isCnaeDivisionMapping(payload)) {
    throw new Error("O arquivo mapCnaes.json possui uma estrutura invalida.");
  }

  return new Map(Object.entries(payload));
}

//? O mapeamento e lido uma unica vez quando o servidor inicia. Todas as
//? requisicoes seguintes reutilizam o mesmo Map em memoria.
const cnaeDivisionMap = await loadCnaeDivisionMap();

export function getCnaeType(cnaeCode: string): string | null {
  const normalizedCode = cnaeCode.replace(/\D/g, "");

  if (normalizedCode.length < CNAE_DIVISION_LENGTH) return null;

  const division = normalizedCode.slice(0, CNAE_DIVISION_LENGTH);
  return cnaeDivisionMap.get(division) ?? null;
}

