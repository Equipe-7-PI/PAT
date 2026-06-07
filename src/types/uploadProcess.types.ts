export type CnpjProcessingStatus =
  | "waiting"
  | "loading"
  | "success"
  | "error";

export type EmployerDocumentType = "CNPJ" | "CPF";

export type SpreadsheetPeriodInfo = {
  key: string;
  label: string;
  identified: boolean;
  month: number | null;
  year: number | null;
  startDate: string | null;
  criteria: string;
  warning: string | null;
};

export type CompanyData = {
  documento: string;
  tipoDocumento: EmployerDocumentType;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  nomeExibicao: string;
  origem: "planilha" | "open_cnpj" | "cpf_sem_consulta";
};

export type CnaeData = {
  codigo: string;
  codigoFormatado: string;
  descricao: string | null;
  divisaoCodigo: string;
  divisaoNome: string | null;
  secaoCodigo: string | null;
  secaoNome: string | null;
};

export type VacancyStatusNormalizado =
  | "ABERTA"
  | "PREENCHIDA_PAT"
  | "PREENCHIDA_FORA"
  | "CANCELADA"
  | "SUSPENSA"
  | "EXPIRADA"
  | "DESCONHECIDO";

export type VacancyStatusCategoria =
  | "EM_ANDAMENTO"
  | "SUCESSO"
  | "SUCESSO_FORA_PAT"
  | "PERDA"
  | "PAUSADA"
  | "NAO_PREENCHIDA"
  | "DESCONHECIDA";

export type VacancyNonFulfillmentCategory =
  | "NAO_APLICAVEL"
  | "NAO_INFORMADO"
  | "FALTA_ESCOLARIDADE"
  | "FALTA_EXPERIENCIA"
  | "SALARIO_BAIXO"
  | "HORARIO_INCOMPATIVEL"
  | "DISTANCIA"
  | "FALTA_CNH"
  | "FALTA_CURSO"
  | "CANDIDATO_NAO_COMPARECEU"
  | "EMPRESA_SEM_RETORNO"
  | "CANCELADA_EMPRESA"
  | "PREENCHIDA_FORA_PAT"
  | "SEM_CANDIDATOS";

export type VacancyNonFulfillmentReason = {
  categoria: VacancyNonFulfillmentCategory;
  descricao: string;
  origem:
    | "ausente_na_planilha"
    | "status_planilha"
    | "informado_pelo_atendente";
  confianca: "alta" | "media" | "baixa" | "nao_aplicavel";
};

export type VacancyResultData = {
  preenchida: boolean;
  preenchidaPeloPAT: boolean;
  preenchidaPorOutrasFontes: boolean;
  cancelada: boolean;
  expirada: boolean;
  suspensa: boolean;
  aberta: boolean;
};

export type VacancyDateData = {
  abertura: string | null;
  vencimento: string;
  encerramento: string | null;
  ultimaAcao: string | null;
  periodoReferenciaInicio: string | null;
  observacao: string | null;
};

export type VacancyQuantityData = {
  postosSolicitados: number;
  postosPreenchidos: number | null;
  postosNaoPreenchidos: number | null;
  observacao: string;
};

//? Uma vaga da planilha ja associada ao documento do empregador.
//? Os nomes em portugues formam o contrato que sera consumido pelo dashboard.
export type EmployerVacancyData = {
  codigoVaga: string;
  codigoOcupacao: string;
  descricaoOcupacao: string;
  tipoEmpregador: EmployerDocumentType;
  documentoEmpregador: string;
  statusOriginal: string;
  statusNormalizado: VacancyStatusNormalizado;
  categoriaStatus: VacancyStatusCategoria;
  resultado: VacancyResultData;
  motivoNaoPreenchimento: VacancyNonFulfillmentReason;
  quantidades: VacancyQuantityData;
  datas: VacancyDateData;
  origem: {
    nomeArquivo: string;
    nomeAba: string;
    criterio: string;
  };
};

//? Todos os dados conhecidos de um empregador em um periodo. Para CPF, os
//? campos de CNAE permanecem null porque nao existe consulta de CNAE por CPF.
export type EmployerSpreadsheetData = {
  empresa: CompanyData;
  cnae: CnaeData | null;
  resumo: {
    totalRegistrosVaga: number;
    totalPostosSolicitados: number;
    totalPostosPreenchidos: number | null;
    totalPostosVazios: number | null;
  };
  vagas: EmployerVacancyData[];
};

export type SpreadsheetPeriodData = {
  periodo: SpreadsheetPeriodInfo;
  resumo: {
    totalRegistrosVaga: number;
    totalPostosSolicitados: number;
    totalPostosPreenchidos: number | null;
    totalPostosVazios: number | null;
    totalCnpjs: number;
    totalCpfs: number;
  };
  cnpjs: Record<string, EmployerSpreadsheetData>;
  cpfs: Record<string, EmployerSpreadsheetData>;
};

export type UploadProcessResult = {
  filesProcessed: number;
  vacanciesProcessed: number;
  cnpjsProcessed: number;
  cnpjsFailed: number;
  cpfsProcessed: number;
  //? Map nao possui representacao JSON propria. No evento final ele e
  //? convertido para um objeto que preserva periodo, CNPJ, CPF e vagas.
  dadosPorPeriodo: Record<string, SpreadsheetPeriodData>;
};

export type UploadProcessEvent =
  | {
      type: "identified";
      cnpjs: string[];
      total: number;
    }
  | {
      type: "cnpj-status";
      cnpj: string;
      status: CnpjProcessingStatus;
      cnaeType?: string;
      message?: string;
    }
  | {
      type: "progress";
      completed: number;
      total: number;
      percent: number;
    }
  | {
      type: "complete";
      result: UploadProcessResult;
    }
  | {
      type: "processing-error";
      message: string;
    };

export type UploadAcceptedResponse = {
  message: string;
  processId: string;
  statusUrl: string;
  cnpjs: string[];
};
