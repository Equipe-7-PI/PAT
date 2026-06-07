import type {
  OpenCnpjApiResponse,
  OpenCnpjCnae,
  OpenCnpjCodeDescription,
  OpenCnpjCountry,
  OpenCnpjPartner,
  OpenCnpjPhone,
} from "../types/openCnpj.types";

const OPEN_CNPJ_BASE_URL = "https://api.opencnpj.org";
const CNPJ_LENGTH = 14;

//? Garante que o valor pode ser consultado como um objeto sem perder a
//? seguranca do TypeScript.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

//? Valida todos os campos textuais obrigatorios informados na lista.
function hasStringProperties(
  value: Record<string, unknown>,
  properties: readonly string[],
): boolean {
  return properties.every((property) => isString(value[property]));
}

function isOpenCnpjCodeDescription(
  value: unknown,
): value is OpenCnpjCodeDescription {
  return (
    isRecord(value) &&
    isString(value.codigo) &&
    isString(value.descricao)
  );
}

function isOpenCnpjCountry(value: unknown): value is OpenCnpjCountry {
  return isOpenCnpjCodeDescription(value);
}

function isOpenCnpjCnae(value: unknown): value is OpenCnpjCnae {
  return (
    isRecord(value) &&
    isString(value.codigo) &&
    isString(value.descricao) &&
    isBoolean(value.is_principal)
  );
}

function isOpenCnpjPhone(value: unknown): value is OpenCnpjPhone {
  return (
    isRecord(value) &&
    isString(value.ddd) &&
    isString(value.numero) &&
    isBoolean(value.is_fax)
  );
}

function isOpenCnpjPartner(value: unknown): value is OpenCnpjPartner {
  if (!isRecord(value)) return false;

  const requiredStringProperties = [
    "nome_socio",
    "cnpj_cpf_socio",
    "qualificacao_socio",
    "data_entrada_sociedade",
    "identificador_socio",
    "codigo_pais",
    "representante_legal",
    "nome_representante",
    "faixa_etaria",
  ] as const;

  return (
    hasStringProperties(value, requiredStringProperties) &&
    isOpenCnpjCountry(value.pais) &&
    isOpenCnpjCodeDescription(value.qualificacao_representante)
  );
}

//? Type guard principal. O JSON externo somente recebe a tipagem
//? OpenCnpjApiResponse depois que toda a estrutura esperada e validada.
export function isOpenCnpjApiResponse(
  value: unknown,
): value is OpenCnpjApiResponse {
  if (!isRecord(value)) return false;

  const requiredStringProperties = [
    "cnpj",
    "razao_social",
    "nome_fantasia",
    "situacao_cadastral",
    "data_situacao_cadastral",
    "matriz_filial",
    "data_inicio_atividade",
    "cnae_principal",
    "natureza_juridica",
    "tipo_logradouro",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cep",
    "uf",
    "municipio",
    "codigo_municipio",
    "email",
    "capital_social",
    "ente_federativo",
    "porte_empresa",
    "nome_cidade_exterior",
    "codigo_pais",
    "situacao_especial",
    "data_situacao_especial",
  ] as const;

  return (
    hasStringProperties(value, requiredStringProperties) &&
    isStringArray(value.cnaes_secundarios) &&
    Array.isArray(value.cnaes) &&
    value.cnaes.every(isOpenCnpjCnae) &&
    Array.isArray(value.telefones) &&
    value.telefones.every(isOpenCnpjPhone) &&
    isOpenCnpjCodeDescription(value.qualificacao_responsavel) &&
    isNullableString(value.opcao_simples) &&
    isNullableString(value.data_opcao_simples) &&
    isNullableString(value.data_exclusao_simples) &&
    isNullableString(value.opcao_mei) &&
    isNullableString(value.data_opcao_mei) &&
    isNullableString(value.data_exclusao_mei) &&
    isOpenCnpjCodeDescription(value.motivo_situacao_cadastral) &&
    isOpenCnpjCountry(value.pais) &&
    Array.isArray(value.QSA) &&
    value.QSA.every(isOpenCnpjPartner)
  );
}

//? Remove a formatacao e aceita somente CNPJs com exatamente 14 digitos.
export function normalizeCnpj(cnpj: string): string | null {
  const cleanedCnpj = cnpj.replace(/\D/g, "");

  if (cleanedCnpj.length !== CNPJ_LENGTH) return null;
  return cleanedCnpj;
}

//? Consulta a API e so devolve dados que passaram pelo type guard.
//? Erros HTTP, falhas de rede, timeout e respostas inesperadas resultam em null.
export async function fetchOpenCnpjData(
  cnpj: string,
): Promise<OpenCnpjApiResponse | null> {
  const normalizedCnpj = normalizeCnpj(cnpj);

  if (!normalizedCnpj) {
    console.error(`CNPJ invalido para consulta: ${cnpj}`);
    return null;
  }

  try {
    const response = await fetch(
      `${OPEN_CNPJ_BASE_URL}/${normalizedCnpj}?dataset=receita`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      console.error(
        `Erro ao buscar o CNPJ ${normalizedCnpj}: HTTP ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const payload: unknown = await response.json();

    if (!isOpenCnpjApiResponse(payload)) {
      console.error(
        `A API retornou uma estrutura inesperada para o CNPJ ${normalizedCnpj}.`,
      );
      return null;
    }

    return payload;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Falha ao consultar o CNPJ ${normalizedCnpj}: ${message}`);
    return null;
  }
}
