<p align="left" style="font-size:28px;"><strong><em>Documentação do PI</em></strong></p>
<details>
  <summary><strong>📑 Sumário</strong></summary>

- [1. Introdução](#1-introdução)
  - [Objetivos](#-objetivos)
  - [Metodologia](#-metodologia)
- [2. Requisitos](#2-requisitos)
  - [Requisitos funcionais](#-requisitos-funcionais)
  - [Requisitos não funcionais](#-requisitos-não-funcionais)
- [3. Modelo do banco de dados](#3-modelo-do-banco-de-dados)
- [4. Estudo de viabilidade](#4-estudo-de-viabilidade)
- [5. Regras de negócio (Modelo canvas)](#5-regras-de-negócio-modelo-canvas)
- [6. Design](#6-design)
- [7. Protótipo](#7-protótipo)
- [8. Aplicação](#8-aplicação)

</details>

Para cada semestre, do 1º ao 6º, iremos utilizar este template para documentar o PI - incrementalmente.

# 1. Introdução
Este projeto tem como objetivo desenvolver um **sistema interno para a Prefeitura/PAT** capaz de receber planilhas em formato **XLSX**, realizar a **extração automática dos dados** e apresentar os resultados em **gráficos, indicadores numéricos, filtros e exportação**. A proposta surgiu da necessidade de melhorar a análise das informações que atualmente são tratadas a partir de planilhas e materiais de apoio, tornando o processo mais rápido, visual e funcional.

O sistema será de uso **exclusivo da Prefeitura** e terá fluxo simples e objetivo, sempre seguindo a sequência principal de uso: **Login → Envio das planilhas → Exibição do resultado**. A ideia é estimular o usuário a seguir esse caminho único, reduzindo complexidade e mantendo a experiência direta.

## • Objetivos
* Permitir login de usuários da Prefeitura. ✅
* Receber planilhas XLSX para processamento. ⌛
* Extrair automaticamente os dados enviados. ⌛
* Exibir os resultados em gráficos e números. ⌛
* Permitir filtros sobre os dados processados. ⌛
* Disponibilizar exportação das informações exibidas. ⌛

## • Metodologia
O desenvolvimento seguirá uma abordagem **incremental**, acompanhando os semestres do PI. O protótipo inicial será centrado em três elementos principais: **login, envio de arquivos XLSX e visualização gráfica dos resultados**.

# 2. Requisitos

## • Requisitos funcionais
* O sistema deve permitir que o usuário realize login.
* O sistema deve permitir o envio de arquivos XLSX.
* O sistema deve extrair automaticamente os dados contidos nas planilhas enviadas.
* O sistema deve exibir os dados processados em formato de gráficos.
* O sistema deve exibir indicadores numéricos com base nos dados importados.
* O sistema deve permitir aplicar filtros aos dados exibidos.
* O sistema deve permitir exportar os resultados processados.
* O sistema deve exibir os resultados na mesma tela de envio, sem redirecionamento.

## • Requisitos não funcionais
* O sistema deve possuir interface simples e objetiva.
* O sistema deve seguir fluxo fixo e intuitivo: Login → Excel → Resultado.
* O sistema deve ser executado em ambiente interno da Prefeitura.
* O sistema deve utilizar banco de dados mínimo, apenas para usuários.
* O sistema deve processar os arquivos com rapidez suficiente para exibição imediata dos resultados na mesma tela.
* O sistema não precisa de controle avançado de permissões, apenas autenticação de entrada.

# 3. Modelo do banco de dados
(Modelo conceitual)

# 4. Estudo de viabilidade

# 5. Regras de negócio (Modelo canvas)

# 6.  Design
(Paleta de cor, Tipografia, Logo, Wireframes, Modelo de Navegação)

# 7.  Protótipo
(Gere um protótipo funcional na ferramenta que se sentir mais confortável (Figma, por exemplo) e apresente aqui, indicando o link).

# 8. Aplicação
