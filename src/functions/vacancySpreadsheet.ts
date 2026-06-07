import type {
  SpreadsheetCellValue,
  SpreadsheetRow,
  VacancyEmployerType,
  VacancySpreadsheetData,
  VacancySpreadsheetRow,
  VacancySpreadsheetValidationResult,
} from "../types/upload.types";
import * as XLSX from "xlsx";

const DATA_START_ROW_INDEX = 8;
const LAST_EXPECTED_COLUMN_INDEX = 9;
const MAX_DATA_ROWS = 10_000;

const expectedHeaders = new Map<string, string>([
  ["A7", "Identificação da Vagas"],
  ["C7", "Ocupação"],
  ["E7", "Empregador"],
  ["G7", "Status"],
  ["H7", "Quantidade de Vagas"],
  ["J7", "Data de Vencimento"],
  ["C8", "Código"],
  ["D8", "Descrição"],
  ["E8", "Tipo"],
  ["F8", "Identificador"],
]);

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function cellValueToText(value: SpreadsheetCellValue): string | null {
  if (typeof value === "string") {
    const normalizedValue = normalizeText(value);
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getCellValue(
  sheet: XLSX.WorkSheet,
  address: string,
): SpreadsheetCellValue {
  const cell: XLSX.CellObject | undefined = sheet[address];
  return cell?.v ?? null;
}

function getCellText(sheet: XLSX.WorkSheet, address: string): string | null {
  return cellValueToText(getCellValue(sheet, address));
}

function isEmptyRow(row: SpreadsheetRow): boolean {
  return row.every((value) => value === null);
}

function getDeclaredTotal(row: SpreadsheetRow): number | null {
  for (const value of row) {
    if (typeof value !== "string") continue;

    const match = /^Total:\s*(\d+)$/i.exec(value.trim());
    if (!match?.[1]) continue;

    const total = Number(match[1]);
    return Number.isSafeInteger(total) ? total : null;
  }

  return null;
}

function readRawRow(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
): SpreadsheetRow {
  const values: SpreadsheetRow = [];

  for (let columnIndex = 0; columnIndex <= LAST_EXPECTED_COLUMN_INDEX; columnIndex++) {
    const address = XLSX.utils.encode_cell({
      r: rowIndex,
      c: columnIndex,
    });

    values.push(getCellValue(sheet, address));
  }

  return values;
}

function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseEmployerType(value: SpreadsheetCellValue): VacancyEmployerType | null {
  const employerType = cellValueToText(value)?.toUpperCase();
  return employerType === "CPF" || employerType === "CNPJ"
    ? employerType
    : null;
}

function parsePositiveInteger(value: SpreadsheetCellValue): number | null {
  const textValue = cellValueToText(value);
  if (!textValue || !/^\d+$/.test(textValue)) return null;

  const parsedValue = Number(textValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
}

function parseVacancyRow(
  row: SpreadsheetRow,
  excelRowNumber: number,
): { row: VacancySpreadsheetRow | null; errors: string[] } {
  const errors: string[] = [];

  const vacancyId = cellValueToText(row[0] ?? null);
  const occupationCode = cellValueToText(row[2] ?? null);
  const occupationDescription = cellValueToText(row[3] ?? null);
  const employerType = parseEmployerType(row[4] ?? null);
  const employerDocumentText = cellValueToText(row[5] ?? null);
  const employerDocument = employerDocumentText?.replace(/\D/g, "") ?? "";
  const status = cellValueToText(row[6] ?? null);
  const vacancyQuantity = parsePositiveInteger(row[7] ?? null);
  const expirationDate = cellValueToText(row[9] ?? null);

  if (!vacancyId || !/^\d+$/.test(vacancyId)) {
    errors.push(`Linha ${excelRowNumber}: identificação da vaga inválida.`);
  }

  if (!occupationCode || !/^\d{6}$/.test(occupationCode)) {
    errors.push(`Linha ${excelRowNumber}: código de ocupação deve possuir 6 dígitos.`);
  }

  if (!occupationDescription || occupationDescription.length > 200) {
    errors.push(`Linha ${excelRowNumber}: descrição da ocupação inválida.`);
  }

  if (!employerType) {
    errors.push(`Linha ${excelRowNumber}: tipo do empregador deve ser CPF ou CNPJ.`);
  }

  if (
    employerType &&
    employerDocument.length !== (employerType === "CPF" ? 11 : 14)
  ) {
    errors.push(
      `Linha ${excelRowNumber}: identificador não corresponde ao tipo ${employerType}.`,
    );
  }

  if (!status || status.length > 120) {
    errors.push(`Linha ${excelRowNumber}: status da vaga inválido.`);
  }

  if (vacancyQuantity === null) {
    errors.push(`Linha ${excelRowNumber}: quantidade de vagas deve ser um inteiro positivo.`);
  }

  if (!expirationDate || !isValidCalendarDate(expirationDate)) {
    errors.push(`Linha ${excelRowNumber}: data de vencimento deve usar DD/MM/AAAA.`);
  }

  //? As colunas B e I pertencem a celulas mescladas e devem permanecer vazias.
  if (row[1] !== null || row[8] !== null) {
    errors.push(`Linha ${excelRowNumber}: estrutura de colunas mescladas inválida.`);
  }

  if (
    errors.length > 0 ||
    !vacancyId ||
    !occupationCode ||
    !occupationDescription ||
    !employerType ||
    !status ||
    vacancyQuantity === null ||
    !expirationDate
  ) {
    return { row: null, errors };
  }

  return {
    row: {
      vacancyId,
      occupationCode,
      occupationDescription,
      employerType,
      employerDocument,
      status,
      vacancyQuantity,
      expirationDate,
    },
    errors,
  };
}

function validateHeaders(sheet: XLSX.WorkSheet): string[] {
  const errors: string[] = [];

  for (const [address, expectedValue] of expectedHeaders) {
    const actualValue = getCellText(sheet, address);

    if (actualValue !== expectedValue) {
      errors.push(
        `Cabeçalho inválido em ${address}: esperado "${expectedValue}".`,
      );
    }
  }

  const reportTitle = getCellText(sheet, "B2");
  if (reportTitle !== "Vagas Usando Critérios - IMO") {
    errors.push('Título inválido: esperado "Vagas Usando Critérios - IMO".');
  }

  return errors;
}

export function validateVacancyWorkbook(
  workbook: XLSX.WorkBook,
): VacancySpreadsheetValidationResult {
  const errors: string[] = [];

  if (workbook.SheetNames.length !== 1) {
    return {
      ok: false,
      errors: ["A planilha deve possuir exatamente uma aba."],
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: false, errors: ["A planilha não possui uma aba válida."] };
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { ok: false, errors: ["Não foi possível acessar a aba da planilha."] };
  }

  const sheetReference = sheet["!ref"];
  if (!sheetReference) {
    return { ok: false, errors: ["A planilha está vazia."] };
  }

  const usedRange = XLSX.utils.decode_range(sheetReference);

  if (usedRange.e.c < LAST_EXPECTED_COLUMN_INDEX) {
    errors.push("A planilha não possui todas as colunas esperadas até J.");
  }

  errors.push(...validateHeaders(sheet));

  const criteria = getCellText(sheet, "A5");
  if (!criteria?.startsWith("[ABRANGÊNCIA =")) {
    errors.push("A linha de critérios do relatório não foi reconhecida.");
  }

  const rawRows: SpreadsheetRow[] = [];
  let declaredTotal: number | null = null;
  let footerFound = false;

  for (let rowIndex = DATA_START_ROW_INDEX; rowIndex <= usedRange.e.r; rowIndex++) {
    const currentRow = readRawRow(sheet, rowIndex);

    if (isEmptyRow(currentRow) && rowIndex < usedRange.e.r) {
      const nextRow = readRawRow(sheet, rowIndex + 1);
      const total = getDeclaredTotal(nextRow);

      if (total !== null) {
        declaredTotal = total;
        footerFound = true;
        break;
      }
    }

    rawRows.push(currentRow);
  }

  if (!footerFound || declaredTotal === null) {
    errors.push('Rodapé inválido: esperado uma linha vazia seguida por "Total: N".');
  }

  if (rawRows.length === 0) {
    errors.push("A planilha não possui vagas para processar.");
  }

  if (rawRows.length > MAX_DATA_ROWS) {
    errors.push(`A planilha excede o limite de ${MAX_DATA_ROWS} vagas.`);
  }

  const parsedRows: VacancySpreadsheetRow[] = [];

  for (let index = 0; index < rawRows.length; index++) {
    const parsedRow = parseVacancyRow(
      rawRows[index]!,
      DATA_START_ROW_INDEX + index + 1,
    );

    errors.push(...parsedRow.errors);
    if (parsedRow.row) parsedRows.push(parsedRow.row);
  }

  if (declaredTotal !== null && declaredTotal !== rawRows.length) {
    errors.push(
      `O total declarado (${declaredTotal}) não corresponde às ${rawRows.length} linhas encontradas.`,
    );
  }

  if (errors.length > 0 || !criteria || declaredTotal === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      fileName: "",
      sheetName,
      criteria,
      declaredTotal,
      rows: parsedRows,
    },
  };
}
