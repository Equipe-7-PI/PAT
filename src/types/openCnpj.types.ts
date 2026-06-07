//? Estrutura reutilizada pela API para campos compostos por codigo e descricao.
export type OpenCnpjCodeDescription = {
  codigo: string;
  descricao: string;
};

//? CNAE detalhado retornado pela API.
export type OpenCnpjCnae = OpenCnpjCodeDescription & {
  is_principal: boolean;
};

//? Telefone cadastrado para a empresa.
export type OpenCnpjPhone = {
  ddd: string;
  numero: string;
  is_fax: boolean;
};

//? Pais relacionado a empresa, socio ou representante.
export type OpenCnpjCountry = OpenCnpjCodeDescription;

//? Socio retornado dentro do Quadro de Socios e Administradores (QSA).
export type OpenCnpjPartner = {
  nome_socio: string;
  cnpj_cpf_socio: string;
  qualificacao_socio: string;
  data_entrada_sociedade: string;
  identificador_socio: string;
  codigo_pais: string;
  pais: OpenCnpjCountry;
  representante_legal: string;
  nome_representante: string;
  qualificacao_representante: OpenCnpjCodeDescription;
  faixa_etaria: string;
};

//? Alguns campos podem ser null em registros nos quais a Receita Federal
//? nao publicou a informacao correspondente.
export type OpenCnpjNullableString = string | null;

//? Resposta validada da consulta de CNPJ no dataset da Receita Federal.
export type OpenCnpjApiResponse = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  matriz_filial: string;
  data_inicio_atividade: string;
  cnae_principal: string;
  cnaes_secundarios: string[];
  cnaes: OpenCnpjCnae[];
  natureza_juridica: string;
  tipo_logradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  codigo_municipio: string;
  email: string;
  telefones: OpenCnpjPhone[];
  capital_social: string;
  qualificacao_responsavel: OpenCnpjCodeDescription;
  ente_federativo: string;
  porte_empresa: string;
  opcao_simples: OpenCnpjNullableString;
  data_opcao_simples: OpenCnpjNullableString;
  data_exclusao_simples: OpenCnpjNullableString;
  opcao_mei: OpenCnpjNullableString;
  data_opcao_mei: OpenCnpjNullableString;
  data_exclusao_mei: OpenCnpjNullableString;
  motivo_situacao_cadastral: OpenCnpjCodeDescription;
  nome_cidade_exterior: string;
  codigo_pais: string;
  pais: OpenCnpjCountry;
  situacao_especial: string;
  data_situacao_especial: string;
  QSA: OpenCnpjPartner[];
};
