import { getCnaeType } from "../functions/cnaeMapping";
import {
  applyCnpjDataToResultMap,
  collectUniqueCnpjsFromResultMap,
  countUniqueCpfsFromResultMap,
  createSpreadsheetResultMap,
  formatCnpj,
  serializeSpreadsheetResultMap,
} from "../functions/spreadsheetResultMapping";
import { fetchOpenCnpjData } from "../functions/openCnpj";
import { requireAuth } from "../functions/session";
import {
  createUploadProcess,
  createUploadProcessStream,
  getUploadProcessForUser,
  publishUploadProcessEvent,
} from "../functions/uploadProcess";
import { validateVacancyWorkbook } from "../functions/vacancySpreadsheet";
import type { Routes } from "../types/routesGlobal.types";
import type {
  CnaeData,
  CompanyData,
  UploadAcceptedResponse,
  UploadProcessResult,
} from "../types/uploadProcess.types";
import type { OpenCnpjApiResponse } from "../types/openCnpj.types";
import type { VacancySpreadsheetData } from "../types/upload.types";
import * as XLSX from "xlsx";

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const allowedSpreadsheetExtensions = new Set(["xls", "xlsx", "csv"]);
const cnaeSections = [
  {
    code: "A",
    name: "Agricultura, pecuária, produção florestal, pesca e aquicultura",
    start: 1,
    end: 3,
  },
  { code: "B", name: "Indústrias extrativas", start: 5, end: 9 },
  { code: "C", name: "Indústrias de transformação", start: 10, end: 33 },
  { code: "D", name: "Eletricidade e gás", start: 35, end: 35 },
  {
    code: "E",
    name: "Água, esgoto, atividades de gestão de resíduos e descontaminação",
    start: 36,
    end: 39,
  },
  { code: "F", name: "Construção", start: 41, end: 43 },
  {
    code: "G",
    name: "Comércio; reparação de veículos automotores e motocicletas",
    start: 45,
    end: 47,
  },
  { code: "H", name: "Transporte, armazenagem e correio", start: 49, end: 53 },
  { code: "I", name: "Alojamento e alimentação", start: 55, end: 56 },
  { code: "J", name: "Informação e comunicação", start: 58, end: 63 },
  {
    code: "K",
    name: "Atividades financeiras, de seguros e serviços relacionados",
    start: 64,
    end: 66,
  },
  { code: "L", name: "Atividades imobiliárias", start: 68, end: 68 },
  {
    code: "M",
    name: "Atividades profissionais, científicas e técnicas",
    start: 69,
    end: 75,
  },
  {
    code: "N",
    name: "Atividades administrativas e serviços complementares",
    start: 77,
    end: 82,
  },
  {
    code: "O",
    name: "Administração pública, defesa e seguridade social",
    start: 84,
    end: 84,
  },
  { code: "P", name: "Educação", start: 85, end: 85 },
  { code: "Q", name: "Saúde humana e serviços sociais", start: 86, end: 88 },
  { code: "R", name: "Artes, cultura, esporte e recreação", start: 90, end: 93 },
  { code: "S", name: "Outras atividades de serviços", start: 94, end: 96 },
  { code: "T", name: "Serviços domésticos", start: 97, end: 97 },
  {
    code: "U",
    name: "Organismos internacionais e outras instituições extraterritoriais",
    start: 99,
    end: 99,
  },
] as const;

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isSupportedSpreadsheetFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension !== undefined && allowedSpreadsheetExtensions.has(extension);
}

function getRequestFiles(entries: FormDataEntryValue[]): File[] {
  return entries.filter((entry): entry is File => entry instanceof File);
}

function validateUploadedFiles(files: File[]): string[] {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push("Nenhuma planilha foi enviada.");
    return errors;
  }

  if (files.length > MAX_FILES) {
    errors.push(`Envie no máximo ${MAX_FILES} planilhas por requisição.`);
  }

  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    errors.push("O tamanho total das planilhas não pode ultrapassar 50 MB.");
  }

  for (const file of files) {
    if (!isSupportedSpreadsheetFile(file)) {
      errors.push(
        `${file.name}: extensão inválida. Use apenas .xls, .xlsx ou .csv.`,
      );
    }

    if (file.size === 0) {
      errors.push(`${file.name}: o arquivo está vazio.`);
    }
  }

  return errors;
}

async function readAndValidateSpreadsheet(
  file: File,
): Promise<
  | { ok: true; data: VacancySpreadsheetData }
  | { ok: false; errors: string[] }
> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
    });

    const validation = validateVacancyWorkbook(workbook);

    if (!validation.ok) {
      return {
        ok: false,
        errors: validation.errors.map((error) => `${file.name}: ${error}`),
      };
    }

    return validation;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      errors: [`${file.name}: não foi possível ler a planilha (${message}).`],
    };
  }
}

function formatCnaeCode(cnaeCode: string): string {
  const normalizedCode = cnaeCode.replace(/\D/g, "");

  if (!/^\d{7}$/.test(normalizedCode)) return cnaeCode;

  return normalizedCode.replace(/^(\d{4})(\d)(\d{2})$/, "$1-$2/$3");
}

function getCnaeSection(
  divisionCode: string,
): { code: string; name: string } | null {
  const divisionNumber = Number(divisionCode);
  if (!Number.isInteger(divisionNumber)) return null;

  const section = cnaeSections.find(
    (item) => divisionNumber >= item.start && divisionNumber <= item.end,
  );

  if (!section) return null;

  return {
    code: section.code,
    name: section.name,
  };
}

function getMainCnaeDescription(cnpjData: OpenCnpjApiResponse): string | null {
  const mainCnae =
    cnpjData.cnaes.find((cnae) => cnae.is_principal) ??
    cnpjData.cnaes.find((cnae) => cnae.codigo === cnpjData.cnae_principal);

  return mainCnae?.descricao || null;
}

function createCompanyData(
  cnpjData: OpenCnpjApiResponse,
  formattedCnpj: string,
): CompanyData {
  const name = cnpjData.nome_fantasia.trim() || cnpjData.razao_social;

  return {
    documento: formattedCnpj,
    tipoDocumento: "CNPJ",
    razaoSocial: cnpjData.razao_social,
    nomeFantasia: cnpjData.nome_fantasia.trim() || null,
    nomeExibicao: name,
    origem: "open_cnpj",
  };
}

function createCnaeData(cnpjData: OpenCnpjApiResponse): CnaeData | null {
  const normalizedCode = cnpjData.cnae_principal.replace(/\D/g, "");
  if (!/^\d{7}$/.test(normalizedCode)) return null;

  const divisionCode = normalizedCode.slice(0, 2);
  const section = getCnaeSection(divisionCode);

  return {
    codigo: normalizedCode,
    codigoFormatado: formatCnaeCode(normalizedCode),
    descricao: getMainCnaeDescription(cnpjData),
    divisaoCodigo: divisionCode,
    divisaoNome: getCnaeType(normalizedCode),
    secaoCodigo: section?.code ?? null,
    secaoNome: section?.name ?? null,
  };
}

async function processCnpjs(
  processId: string,
  cnpjs: string[],
  spreadsheets: VacancySpreadsheetData[],
): Promise<void> {
  //? O Map nasce com todos os dados das planilhas, ja separados por periodo,
  //? CNPJ e CPF. A API externa apenas complementa os CNPJs com CNAE.
  const resultMap = createSpreadsheetResultMap(spreadsheets);
  let completed = 0;
  let failed = 0;

  for (const cnpj of cnpjs) {
    const formattedCnpj = formatCnpj(cnpj);

    publishUploadProcessEvent(processId, {
      type: "cnpj-status",
      cnpj: formattedCnpj,
      status: "loading",
      message: "Consultando...",
    });

    const cnpjData = await fetchOpenCnpjData(cnpj);
    const cnaeData = cnpjData ? createCnaeData(cnpjData) : null;

    if (cnpjData) {
      applyCnpjDataToResultMap(
        resultMap,
        cnpj,
        createCompanyData(cnpjData, formattedCnpj),
        cnaeData,
      );
    }

    if (!cnpjData) {
      failed += 1;
      publishUploadProcessEvent(processId, {
        type: "cnpj-status",
        cnpj: formattedCnpj,
        status: "error",
        message: "Nao foi possivel consultar o CNPJ.",
      });
    } else if (!cnaeData?.divisaoNome) {
      failed += 1;
      publishUploadProcessEvent(processId, {
        type: "cnpj-status",
        cnpj: formattedCnpj,
        status: "error",
        message: `CNAE ${cnpjData.cnae_principal} nao mapeado.`,
      });
    } else {
      publishUploadProcessEvent(processId, {
        type: "cnpj-status",
        cnpj: formattedCnpj,
        status: "success",
        cnaeType: cnaeData.divisaoNome,
        message: "Concluido",
      });
    }

    completed += 1;
    publishUploadProcessEvent(processId, {
      type: "progress",
      completed,
      total: cnpjs.length,
      percent:
        cnpjs.length === 0
          ? 100
          : Math.round((completed / cnpjs.length) * 100),
    });
  }

  const result: UploadProcessResult = {
    filesProcessed: spreadsheets.length,
    vacanciesProcessed: spreadsheets.reduce(
      (total, spreadsheet) => total + spreadsheet.rows.length,
      0,
    ),
    cnpjsProcessed: completed,
    cnpjsFailed: failed,
    cpfsProcessed: countUniqueCpfsFromResultMap(resultMap),
    //? JSON.stringify(new Map()) produziria apenas "{}". Por isso o Map
    //? permanece durante o processamento e vira objeto somente na resposta.
    dadosPorPeriodo: serializeSpreadsheetResultMap(resultMap),
  };

  console.log("Dados das planilhas agrupados por periodo:", resultMap);

  publishUploadProcessEvent(processId, {
    type: "complete",
    result,
  });
}

function startCnpjProcessing(
  processId: string,
  cnpjs: string[],
  spreadsheets: VacancySpreadsheetData[],
): void {
  void processCnpjs(processId, cnpjs, spreadsheets).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Falha no processamento ${processId}: ${message}`);

      publishUploadProcessEvent(processId, {
        type: "processing-error",
        message: "O processamento foi interrompido por um erro interno.",
      });
    },
  );
}

export const uploadRoute: Routes = {
  "/upload-planilhas": {
    async POST(req) {
      const auth = requireAuth(req);
      if (!auth.ok) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      let form: FormData;

      try {
        form = await req.formData();
      } catch {
        return jsonResponse(
          { errors: ["A requisição deve usar multipart/form-data válido."] },
          400,
        );
      }

      const files = getRequestFiles(form.getAll("planilhas"));
      const uploadErrors = validateUploadedFiles(files);

      if (uploadErrors.length > 0) {
        return jsonResponse({ errors: uploadErrors }, 400);
      }

      const spreadsheets: VacancySpreadsheetData[] = [];
      const contentErrors: string[] = [];

      //? A validacao e feita antes de qualquer consulta externa ou processamento.
      for (const file of files) {
        const result = await readAndValidateSpreadsheet(file);

        if (!result.ok) {
          contentErrors.push(...result.errors);
          continue;
        }

        spreadsheets.push({
          ...result.data,
          fileName: file.name,
        });
      }

      //? Se uma planilha falhar, o lote inteiro e rejeitado para evitar
      //? processamento parcial e resultados inconsistentes.
      if (contentErrors.length > 0) {
        return jsonResponse({ errors: contentErrors }, 400);
      }

      const initialResultMap = createSpreadsheetResultMap(spreadsheets);
      const cnpjs = collectUniqueCnpjsFromResultMap(initialResultMap);
      const formattedCnpjs = cnpjs.map(formatCnpj);
      const processId = createUploadProcess(auth.session.userId);

      //? O primeiro evento e registrado antes da resposta do POST. Quando o
      //? EventSource conectar, o historico garante que ele sera reproduzido.
      publishUploadProcessEvent(processId, {
        type: "identified",
        cnpjs: formattedCnpjs,
        total: formattedCnpjs.length,
      });

      //? Nao aguardamos as consultas externas aqui. O cliente recebe 202,
      //? abre o SSE e acompanha o trabalho que continua no servidor.
      startCnpjProcessing(processId, cnpjs, spreadsheets);

      const response: UploadAcceptedResponse = {
        message: "Planilhas validadas. O processamento foi iniciado.",
        processId,
        statusUrl: `/upload-status/${processId}`,
        cnpjs: formattedCnpjs,
      };

      return jsonResponse(response, 202);
    },
  },
  "/upload-status/:processId": {
    GET(req, server) {
      const auth = requireAuth(req);
      if (!auth.ok) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const pathname = new URL(req.url).pathname;
      const processId = decodeURIComponent(
        pathname.slice("/upload-status/".length),
      );
      const process = getUploadProcessForUser(
        processId,
        auth.session.userId,
      );

      if (!process) {
        return jsonResponse({ error: "Processamento nao encontrado." }, 404);
      }

      //? Uma conexao SSE pode ficar alguns segundos sem eventos. Sem isto o
      //? Bun encerraria a resposta por inatividade.
      server.timeout(req, 0);

      return new Response(createUploadProcessStream(process), {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    },
  },
};
