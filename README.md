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
## Modelo conceitual

O modelo conceitual do banco de dados descreve as principais entidades do sistema, seus atributos e a forma como esses elementos representam as informações manipuladas pela aplicação.

Neste momento, o modelo apresenta a entidade **USUARIO**, responsável por armazenar os dados relacionados aos usuários cadastrados no sistema, incluindo informações de identificação, autenticação, controle de acesso, status da conta e registros de auditoria.

---

## Entidade: USUARIO
<img width="1227" height="529" alt="image" src="https://github.com/user-attachments/assets/a6f89666-85e0-4117-b30f-fe676544b4d6" />

A entidade **USUARIO** representa uma pessoa ou conta autorizada a acessar o sistema. Ela concentra os dados necessários para autenticação, identificação do usuário, controle de permissões e acompanhamento de atividades básicas, como criação, atualização e último acesso.

### Atributos da entidade

| Campo | Descrição |
|---|---|
| `id` | Identificador único do usuário. Atua como chave primária da entidade, garantindo que cada registro seja individualmente reconhecido no banco de dados. |
| `hash_password` | Armazena a senha do usuário em formato de hash. Por segurança, a senha nunca deve ser salva em texto puro. |
| `created_at` | Registra a data e hora em que o usuário foi criado no sistema. |
| `user` | Representa o nome de usuário, login ou identificador utilizado para acesso ao sistema. |
| `updated_at` | Registra a data e hora da última alteração feita nos dados do usuário. |
| `nome` | Armazena o primeiro nome do usuário. |
| `sobrenome` | Armazena o sobrenome do usuário. |
| `active` | Indica se o usuário está ativo ou inativo no sistema. Pode ser utilizado para permitir ou bloquear o acesso sem remover o registro do banco de dados. |
| `role` | Campo adicionado como possível melhoria futura para controle de permissões. Na versão atual, todos os usuários utilizarão o valor padrão `1`, representando acesso geral. Caso futuramente seja necessário diferenciar perfis de acesso, a estrutura já estará preparada. |
| `last_login_at` | Registra a data e hora do último login realizado pelo usuário. Pode ser um campo opcional, pois usuários recém-criados podem ainda não ter acessado o sistema. |

---

## Regras e observações

O campo `id` é utilizado como identificador principal da entidade **USUARIO** e deve ser único para cada registro.

O campo `hash_password` deve armazenar somente o resultado do processo de criptografia/hash da senha, seguindo boas práticas de segurança e evitando o armazenamento de senhas em texto puro.

Os campos `created_at` e `updated_at` auxiliam no controle de auditoria, permitindo identificar quando o registro foi criado e quando sofreu sua última alteração.

O campo `active` permite controlar o acesso do usuário sem a necessidade de excluir seus dados do banco. Dessa forma, é possível desativar temporariamente uma conta mantendo seu histórico preservado.

O campo `role` foi adicionado como uma possível melhoria futura para controle de permissões por perfil de usuário. Na versão atual do sistema, todos os usuários utilizarão o valor padrão `1`, representando acesso geral. Caso não haja necessidade de diferentes níveis de permissão, o campo continuará utilizando apenas esse valor sem impactar o funcionamento geral da aplicação.

O campo `last_login_at` pode permanecer vazio até que o usuário realize seu primeiro acesso.

---

## Resumo

A entidade **USUARIO** centraliza os dados necessários para gerenciamento de acesso ao sistema. Ela permite identificar usuários, validar autenticação, controlar permissões, verificar o status da conta e manter registros básicos de criação, atualização e último login.

# 4. Estudo de viabilidade

> **Sistema de Análise de Planilhas para Prefeitura/PAT**

## 4.1 Introdução

O projeto compreende um sistema interno para o Posto de Atendimento ao Trabalhador (PAT), associado à Prefeitura Municipal de Jaú, que deverá receber planilhas (em formato `.xlsx`), extrair dados de forma automática e apresentar os resultados em gráficos, indicadores numéricos, filtros e exportação.

O objetivo é substituir o método de análise manual e limitado por um processo automatizado, intuitivo e visual, seguindo o fluxo:

**Login → Envio das planilhas → Exibição do resultado**

## 4.2 Descrição do Projeto

O projeto consiste no desenvolvimento de uma aplicação digital voltada para análise automatizada de dados provenientes de planilhas utilizadas internamente pela Prefeitura/PAT.

### Problema a ser resolvido

Atualmente, a análise de dados é realizada manualmente ou com apoio limitado de ferramentas, o que resulta em:

- Processos lentos
- Maior chance de erro humano
- Dificuldade de visualização de dados
- Baixa padronização nas análises

### Proposta de solução

- Importação automatizada de arquivos XLSX
- Processamento e estruturação dos dados
- Geração de gráficos e indicadores
- Aplicação de filtros dinâmicos
- Exportação dos resultados

### Público-alvo

- Funcionários da Prefeitura
- Analistas de dados do PAT
- Gestores que necessitam de relatórios rápidos

## 4.3 Viabilidade Técnica

### Tecnologias necessárias

- **Back-end:** TypeScript com Bun
- **Front-end:** HTML, CSS e JS
- **Manipulação de planilhas:** Via front-end (JavaScript por parte do cliente)
- **Banco de dados:** PostgreSQL

### Infraestrutura

- Servidor local disponibilizado pela própria Prefeitura
- Ambiente controlado (uso interno)

### Riscos técnicos

- Inconsistência nos formatos das planilhas
- Volume elevado de dados
- Necessidade de padronização prévia

> **Conclusão técnica:** O projeto é tecnicamente viável, com riscos controláveis.

## 4.4 Viabilidade Econômica

### Custos iniciais

- **Desenvolvimento:** baixo
- **Infraestrutura:** moderado

### Custos operacionais

- Manutenção do sistema (quando necessário)
- Atualizações (quando necessário)
- Suporte técnico (quando necessário)

### Retorno esperado

Embora não gere lucro direto, o sistema proporciona:

- Redução de tempo de análise
- Aumento de produtividade
- Melhor tomada de decisão

> **Conclusão econômica:** O projeto é economicamente viável, com alto retorno indireto.

## 4.5 Viabilidade de Mercado

Como se trata de um sistema interno, não há competição direta de mercado. No entanto, existem soluções similares genéricas (como Excel avançado ou ferramentas de BI) que não são totalmente adaptadas à realidade da Prefeitura.

### Diferencial

- Sistema personalizado
- Fluxo simplificado
- Foco em necessidades específicas

> **Conclusão de mercado:** O projeto possui alta relevância interna, mesmo sem atuação comercial.

## 4.6 Viabilidade Operacional

### Estrutura necessária

- 5 desenvolvedores (Front-End, Back-End e Full Stack)
- Usuários finais já existentes (funcionários)

### Processo de uso

1. Login
2. Upload da planilha
3. Visualização dos resultados

> **Conclusão operacional:** O projeto é operacionalmente viável e simples de implementar. O fluxo linear reduz a curva de aprendizado e erros operacionais.

## 4.7 Viabilidade Legal

O sistema deve estar em conformidade com a **Lei Geral de Proteção de Dados (LGPD)**, garantindo:

- Controle de acesso (login)
- Proteção de dados sensíveis
- Armazenamento seguro

Por ser um sistema interno, os riscos legais são reduzidos, desde que boas práticas sejam seguidas.

> **Conclusão legal:** O projeto é legalmente viável, com atenção à proteção de dados.

## 4.8 Análise de Riscos

| **Risco** | **Impacto** | **Probabilidade** | **Mitigação** |
| --- | --- | --- | --- |
| Planilhas fora do padrão | Alto | Médio | Validação e padronização |
| Resistência dos usuários | Médio | Médio | Treinamento |
| Problemas de desempenho | Médio | Baixo | Otimização |

## 4.9 Conclusão Final

Com base nas análises realizadas, o **Sistema de Análise de Planilhas para Prefeitura/PAT** é considerado **viável**, pois apresenta:

- Baixa complexidade técnica
- Alto ganho operacional
- Baixo custo de implementação
- Impacto direto na eficiência do trabalho

Recomenda-se o desenvolvimento do sistema, com foco inicial em um **MVP (produto mínimo viável)** para validação interna.

# 5. Regras de negócio (Modelo canvas)
<img width="1304" height="436" alt="image" src="https://github.com/user-attachments/assets/f3c4fae3-d559-4128-83b3-b46ca9561c31"/>

# 6.  Design
(Paleta de cor, Tipografia, Logo, Wireframes, Modelo de Navegação)

# 7.  Protótipo
(Gere um protótipo funcional na ferramenta que se sentir mais confortável (Figma, por exemplo) e apresente aqui, indicando o link).

# 8. Aplicação
