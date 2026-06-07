//? Valores brutos que o SheetJS pode entregar pela propriedade "v" de uma celula.
export type SpreadsheetCellValue = string | number | boolean | Date | null;

//? Uma linha extraida da planilha, mantendo a ordem original das colunas.
export type SpreadsheetRow = SpreadsheetCellValue[];

export type VacancyEmployerType = "CPF" | "CNPJ";

//? Linha validada e normalizada do relatorio "Vagas Usando Criterios - IMO".
export type VacancySpreadsheetRow = {
  vacancyId: string;
  occupationCode: string;
  occupationDescription: string;
  employerType: VacancyEmployerType;
  employerDocument: string;
  status: string;
  vacancyQuantity: number;
  expirationDate: string;
};

//? Resultado tipado produzido somente depois que toda a planilha foi validada.
export type VacancySpreadsheetData = {
  //? Nome original recebido no upload. Ele fica salvo apenas para auditoria e
  //? rastreabilidade; a identificacao do periodo nao depende deste nome.
  fileName: string;
  sheetName: string;
  criteria: string;
  declaredTotal: number;
  rows: VacancySpreadsheetRow[];
};

export type VacancySpreadsheetValidationResult =
  | {
      ok: true;
      data: VacancySpreadsheetData;
    }
  | {
      ok: false;
      errors: string[];
    };
