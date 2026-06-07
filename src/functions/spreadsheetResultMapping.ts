import { normalizeCnpj } from "./openCnpj";
import type {
  CnaeData,
  CompanyData,
  EmployerDocumentType,
  EmployerSpreadsheetData,
  EmployerVacancyData,
  SpreadsheetPeriodData,
  SpreadsheetPeriodInfo,
  VacancyNonFulfillmentReason,
  VacancyResultData,
  VacancyStatusCategoria,
  VacancyStatusNormalizado,
} from "../types/uploadProcess.types";
import type {
  VacancySpreadsheetData,
  VacancySpreadsheetRow,
} from "../types/upload.types";

type SpreadsheetPeriodDataMap = Omit<
  SpreadsheetPeriodData,
  "cnpjs" | "cpfs"
> & {
  cnpjs: Map<string, EmployerSpreadsheetData>;
  cpfs: Map<string, EmployerSpreadsheetData>;
};

const UNKNOWN_PERIOD_KEY = "periodo-nao-identificado";
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function formatCnpj(cnpj: string): string {
  const normalizedCnpj = normalizeCnpj(cnpj);
  if (!normalizedCnpj) return cnpj;

  return normalizedCnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function normalizeCpf(cpf: string): string | null {
  const cleanedCpf = cpf.replace(/\D/g, "");
  return cleanedCpf.length === 11 ? cleanedCpf : null;
}

function formatCpf(cpf: string): string {
  const normalizedCpf = normalizeCpf(cpf);
  if (!normalizedCpf) return cpf;

  return normalizedCpf.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    "$1.$2.$3-$4",
  );
}

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getUnknownPeriodInfo(criteria: string): SpreadsheetPeriodInfo {
  return {
    key: UNKNOWN_PERIOD_KEY,
    label: "Período não identificado",
    identified: false,
    month: null,
    year: null,
    startDate: null,
    criteria,
    warning:
      "Não foi possível identificar a data inicial do período no critério da planilha.",
  };
}

//? O nome do arquivo nao e usado para definir o mes. A primeira data encontrada
//? no criterio da planilha e a fonte de verdade para o agrupamento mensal.
function getSpreadsheetPeriodInfo(criteria: string): SpreadsheetPeriodInfo {
  const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(criteria);
  if (!match?.[1] || !match[2] || !match[3]) {
    return getUnknownPeriodInfo(criteria);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!isValidCalendarDate(day, month, year)) {
    return {
      ...getUnknownPeriodInfo(criteria),
      warning: `A data inicial "${match[0]}" foi encontrada, mas nao e uma data valida.`,
    };
  }

  const monthName = monthNames[month - 1];
  if (!monthName) return getUnknownPeriodInfo(criteria);

  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${monthName}/${year}`,
    identified: true,
    month,
    year,
    startDate: match[0],
    criteria,
    warning: null,
  };
}

function formatEmployerDocument(
  employerType: EmployerDocumentType,
  document: string,
): string {
  return employerType === "CNPJ"
    ? formatCnpj(document)
    : formatCpf(document);
}

function getEmployerBucket(
  periodData: SpreadsheetPeriodDataMap,
  employerType: EmployerDocumentType,
): Map<string, EmployerSpreadsheetData> {
  return employerType === "CNPJ" ? periodData.cnpjs : periodData.cpfs;
}

function createEmployerData(
  employerType: EmployerDocumentType,
  document: string,
): EmployerSpreadsheetData {
  const company: CompanyData = {
    documento: document,
    tipoDocumento: employerType,
    razaoSocial: null,
    nomeFantasia: null,
    nomeExibicao: document,
    origem: employerType === "CNPJ" ? "planilha" : "cpf_sem_consulta",
  };

  return {
    empresa: company,
    cnae: null,
    resumo: {
      totalRegistrosVaga: 0,
      totalPostosSolicitados: 0,
      totalPostosPreenchidos: null,
      totalPostosVazios: null,
    },
    vagas: [],
  };
}

function normalizeStatusText(status: string): string {
  return status
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function getVacancyStatus(
  status: string,
): {
  statusNormalizado: VacancyStatusNormalizado;
  categoriaStatus: VacancyStatusCategoria;
} {
  const normalizedStatus = normalizeStatusText(status);

  if (normalizedStatus === "ABERTA") {
    return {
      statusNormalizado: "ABERTA",
      categoriaStatus: "EM_ANDAMENTO",
    };
  }

  if (normalizedStatus === "PREENCHIDA") {
    return {
      statusNormalizado: "PREENCHIDA_PAT",
      categoriaStatus: "SUCESSO",
    };
  }

  if (normalizedStatus === "PREENCHIDA POR OUTRAS FONTES") {
    return {
      statusNormalizado: "PREENCHIDA_FORA",
      categoriaStatus: "SUCESSO_FORA_PAT",
    };
  }

  if (normalizedStatus === "CANCELADA PELO EMPREGADOR") {
    return {
      statusNormalizado: "CANCELADA",
      categoriaStatus: "PERDA",
    };
  }

  if (normalizedStatus === "SUSPENSA") {
    return {
      statusNormalizado: "SUSPENSA",
      categoriaStatus: "PAUSADA",
    };
  }

  if (normalizedStatus.includes("PRAZO DE VALIDADE")) {
    return {
      statusNormalizado: "EXPIRADA",
      categoriaStatus: "NAO_PREENCHIDA",
    };
  }

  return {
    statusNormalizado: "DESCONHECIDO",
    categoriaStatus: "DESCONHECIDA",
  };
}

function getVacancyResult(
  statusNormalizado: VacancyStatusNormalizado,
): VacancyResultData {
  return {
    preenchida:
      statusNormalizado === "PREENCHIDA_PAT" ||
      statusNormalizado === "PREENCHIDA_FORA",
    preenchidaPeloPAT: statusNormalizado === "PREENCHIDA_PAT",
    preenchidaPorOutrasFontes: statusNormalizado === "PREENCHIDA_FORA",
    cancelada: statusNormalizado === "CANCELADA",
    expirada: statusNormalizado === "EXPIRADA",
    suspensa: statusNormalizado === "SUSPENSA",
    aberta: statusNormalizado === "ABERTA",
  };
}

function getNonFulfillmentReason(
  statusNormalizado: VacancyStatusNormalizado,
): VacancyNonFulfillmentReason {
  if (statusNormalizado === "PREENCHIDA_PAT") {
    return {
      categoria: "NAO_APLICAVEL",
      descricao: "A vaga foi preenchida pelo processo do PAT.",
      origem: "status_planilha",
      confianca: "nao_aplicavel",
    };
  }

  if (statusNormalizado === "PREENCHIDA_FORA") {
    return {
      categoria: "PREENCHIDA_FORA_PAT",
      descricao: "A planilha informa que a vaga foi preenchida por outras fontes.",
      origem: "status_planilha",
      confianca: "media",
    };
  }

  if (statusNormalizado === "CANCELADA") {
    return {
      categoria: "CANCELADA_EMPRESA",
      descricao: "A planilha informa que a vaga foi cancelada pelo empregador.",
      origem: "status_planilha",
      confianca: "media",
    };
  }

  if (statusNormalizado === "EXPIRADA") {
    return {
      categoria: "NAO_INFORMADO",
      descricao:
        "A vaga expirou, mas a planilha nao informa o motivo da expiracao.",
      origem: "status_planilha",
      confianca: "baixa",
    };
  }

  return {
    categoria: "NAO_INFORMADO",
    descricao: "Motivo nao disponivel na planilha original.",
    origem: "ausente_na_planilha",
    confianca: "baixa",
  };
}

function createVacancyData(
  spreadsheet: VacancySpreadsheetData,
  row: VacancySpreadsheetRow,
  formattedDocument: string,
  period: SpreadsheetPeriodInfo,
): EmployerVacancyData {
  const { statusNormalizado, categoriaStatus } = getVacancyStatus(row.status);

  return {
    codigoVaga: row.vacancyId,
    codigoOcupacao: row.occupationCode,
    descricaoOcupacao: row.occupationDescription,
    tipoEmpregador: row.employerType,
    documentoEmpregador: formattedDocument,
    statusOriginal: row.status,
    statusNormalizado,
    categoriaStatus,
    resultado: getVacancyResult(statusNormalizado),
    motivoNaoPreenchimento: getNonFulfillmentReason(statusNormalizado),
    quantidades: {
      postosSolicitados: row.vacancyQuantity,
      postosPreenchidos: null,
      postosNaoPreenchidos: null,
      observacao:
        "A planilha informa a quantidade solicitada, mas nao informa quantas vagas foram preenchidas.",
    },
    datas: {
      abertura: null,
      vencimento: row.expirationDate,
      encerramento: null,
      ultimaAcao: null,
      periodoReferenciaInicio: period.startDate,
      observacao:
        "A planilha nao informa datas individuais de abertura, encerramento ou ultima acao da vaga.",
    },
    origem: {
      nomeArquivo: spreadsheet.fileName,
      nomeAba: spreadsheet.sheetName,
      criterio: spreadsheet.criteria,
    },
  };
}

function getOrCreatePeriodData(
  periodsByKey: Map<string, SpreadsheetPeriodDataMap>,
  spreadsheet: VacancySpreadsheetData,
): SpreadsheetPeriodDataMap {
  const period = getSpreadsheetPeriodInfo(spreadsheet.criteria);
  const existingPeriod = periodsByKey.get(period.key);

  if (existingPeriod) return existingPeriod;

  const periodData: SpreadsheetPeriodDataMap = {
    periodo: period,
    resumo: {
      totalRegistrosVaga: 0,
      totalPostosSolicitados: 0,
      totalPostosPreenchidos: null,
      totalPostosVazios: null,
      totalCnpjs: 0,
      totalCpfs: 0,
    },
    cnpjs: new Map(),
    cpfs: new Map(),
  };

  periodsByKey.set(period.key, periodData);
  return periodData;
}

export function createSpreadsheetResultMap(
  spreadsheets: VacancySpreadsheetData[],
): Map<string, SpreadsheetPeriodDataMap> {
  const periodsByKey = new Map<string, SpreadsheetPeriodDataMap>();

  for (const spreadsheet of spreadsheets) {
    const periodData = getOrCreatePeriodData(periodsByKey, spreadsheet);

    for (const row of spreadsheet.rows) {
      const formattedDocument = formatEmployerDocument(
        row.employerType,
        row.employerDocument,
      );
      const vacancy = createVacancyData(
        spreadsheet,
        row,
        formattedDocument,
        periodData.periodo,
      );
      const employerBucket = getEmployerBucket(periodData, row.employerType);
      const employerData =
        employerBucket.get(formattedDocument) ??
        createEmployerData(row.employerType, formattedDocument);

      employerData.vagas.push(vacancy);
      employerData.resumo.totalRegistrosVaga += 1;
      employerData.resumo.totalPostosSolicitados +=
        vacancy.quantidades.postosSolicitados;
      periodData.resumo.totalRegistrosVaga += 1;
      periodData.resumo.totalPostosSolicitados +=
        vacancy.quantidades.postosSolicitados;
      employerBucket.set(formattedDocument, employerData);
    }

    periodData.resumo.totalCnpjs = periodData.cnpjs.size;
    periodData.resumo.totalCpfs = periodData.cpfs.size;
  }

  return periodsByKey;
}

export function collectUniqueCnpjsFromResultMap(
  periodsByKey: Map<string, SpreadsheetPeriodDataMap>,
): string[] {
  const cnpjs = new Set<string>();

  for (const periodData of periodsByKey.values()) {
    for (const cnpj of periodData.cnpjs.keys()) {
      const normalizedCnpj = normalizeCnpj(cnpj);
      if (normalizedCnpj) cnpjs.add(normalizedCnpj);
    }
  }

  return [...cnpjs];
}

export function countUniqueCpfsFromResultMap(
  periodsByKey: Map<string, SpreadsheetPeriodDataMap>,
): number {
  const cpfs = new Set<string>();

  for (const periodData of periodsByKey.values()) {
    for (const cpf of periodData.cpfs.keys()) {
      cpfs.add(cpf);
    }
  }

  return cpfs.size;
}

export function applyCnpjDataToResultMap(
  periodsByKey: Map<string, SpreadsheetPeriodDataMap>,
  cnpj: string,
  company: CompanyData,
  cnae: CnaeData | null,
): void {
  const formattedCnpj = formatCnpj(cnpj);

  for (const periodData of periodsByKey.values()) {
    const employerData = periodData.cnpjs.get(formattedCnpj);
    if (!employerData) continue;

    employerData.empresa = company;
    employerData.cnae = cnae;
  }
}

export function serializeSpreadsheetResultMap(
  periodsByKey: Map<string, SpreadsheetPeriodDataMap>,
): Record<string, SpreadsheetPeriodData> {
  const result: Record<string, SpreadsheetPeriodData> = {};

  for (const [periodKey, periodData] of periodsByKey) {
    result[periodKey] = {
      periodo: periodData.periodo,
      resumo: {
        ...periodData.resumo,
        totalCnpjs: periodData.cnpjs.size,
        totalCpfs: periodData.cpfs.size,
      },
      cnpjs: Object.fromEntries(periodData.cnpjs),
      cpfs: Object.fromEntries(periodData.cpfs),
    };
  }

  return result;
}
