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
* Permitir login de usuários da Prefeitura. 
* Receber planilhas XLSX para processamento. 
* Extrair automaticamente os dados enviados. 
* Exibir os resultados em gráficos e números. 
* Permitir filtros sobre os dados processados. 
* Disponibilizar exportação das informações exibidas. 

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

# 5. Regras de negócio (Modelo Canvas)

O Modelo Canvas foi utilizado para representar, de forma visual e resumida, os principais elementos de negócio envolvidos no projeto. Ele auxilia na identificação do público-alvo, proposta de valor, canais de atendimento, relacionamento com o cliente, recursos necessários, atividades principais, parceiros envolvidos, estrutura de custos e possíveis fontes de renda.

<img width="5000" height="2250" alt="modelo_negocios_canvas_prefeitura_pat" src="https://github.com/user-attachments/assets/63d33f04-bd8b-4d80-b9a3-ebc92884372b" />

## 5.1 Descrição do modelo

O projeto tem como foco apoiar o atendimento e a organização das informações relacionadas ao PAT, oferecendo uma solução que facilite o acesso aos dados necessários pelos funcionários responsáveis.

A proposta de valor está relacionada à otimização do acesso às informações, reduzindo dificuldades operacionais e tornando o processo de consulta mais simples e eficiente.

## 5.2 Elementos do Canvas

| Elemento | Descrição |
|---|---|
| Segmento de mercado | Empresas relacionadas ao ramo de vagas de emprego. |
| Proposta de valor | Facilitar o acesso às informações necessárias para os funcionários do PAT. |
| Canais | Contato por meio de WhatsApp e telefone fixo. |
| Relacionamento com o cliente | Atendimento à prefeitura, com possibilidade de manutenção periódica, verificação da disponibilidade da aplicação e correção de eventuais problemas. |
| Fontes de renda | Não há fonte de renda prevista para o projeto neste momento. |
| Recursos-chave | Infraestrutura, computadores adequados para desenvolvimento e integrantes da equipe capacitados. |
| Atividades-chave | Desenvolvimento da lógica da plataforma, desenvolvimento do front-end e integração com banco de dados. |
| Parceiros-chave | Fatec, professores e facilitadores. |
| Estrutura de custos | Hora-homem dos integrantes da equipe e infraestrutura da Fatec Jaú. |

## 5.3 Regras de negócio identificadas

Com base no Modelo Canvas, foram identificadas as seguintes regras de negócio:

| Código | Regra de negócio |
|---|---|
| RN01 | O sistema deve facilitar o acesso dos funcionários do PAT às informações necessárias para suas atividades. |
| RN02 | O sistema deve ser desenvolvido considerando a prefeitura como cliente principal do projeto. |
| RN03 | O sistema deve permitir manutenção e correções futuras, caso sejam identificados problemas após a implantação. |
| RN04 | O contato com o cliente poderá ocorrer por meio de WhatsApp ou telefone fixo. |
| RN05 | O projeto não possui fonte de renda prevista neste momento, por se tratar de uma solução acadêmica/institucional. |
| RN06 | O desenvolvimento depende da infraestrutura disponível, dos computadores utilizados e da equipe responsável pelo projeto. |
| RN07 | O sistema deve contemplar desenvolvimento da lógica da aplicação, interface front-end e integração com banco de dados. |
| RN08 | A Fatec, professores e facilitadores atuam como parceiros de apoio ao desenvolvimento do projeto. |

## 5.4 Observações

O Modelo Canvas apresentado tem como objetivo apoiar a compreensão estratégica do projeto, não representando diretamente a estrutura técnica do sistema. Ele serve como base para identificar necessidades, limitações, envolvidos e possíveis decisões relacionadas ao desenvolvimento da solução.

As regras de negócio descritas a partir do Canvas poderão ser ajustadas conforme novas necessidades forem identificadas durante o desenvolvimento ou validação com o cliente.
# 6. Design

## 6.1 Identidade Visual

### Conceito e Diretrizes

A identidade visual do Sistema PAT foi construída sobre três pilares: **institucionalidade**, **clareza** e **modernidade**. Por tratar-se de um sistema público municipal, a linguagem visual transmite confiança, seriedade e acessibilidade — valores essenciais em plataformas de governo.

O design adota estilo minimalista, com hierarquia visual clara, espaços generosos e uso estratégico do azul — cor institucional da Prefeitura de Jaú, amplamente associada à credibilidade, tecnologia e governança pública.

### Logo e Marca

A marca é composta por três elementos integrados:

- **Brasão oficial da Prefeitura Municipal de Jaú** — âncora institucional, garante reconhecimento imediato
- **Sigla "PAT"** em tipografia sans-serif Bold, caixa alta — moderna e objetiva
- **Descritivo "Posto de Atendimento ao Trabalhador"** em fonte menor — completa a hierarquia textual

Essa composição aparece na sidebar do sistema, posicionada no topo, garantindo presença constante da marca durante toda a navegação.

**Versões de aplicação:**

| Versão | Descrição |
|---|---|
| Principal | Brasão colorido + texto branco — sobre fundo azul escuro (sidebar) |
| Positiva | Brasão + texto azul escuro — sobre fundos claros (documentos, relatórios) |
| Reduzida | Apenas o brasão — para favicon, app mobile ou espaços reduzidos |

**Restrições de uso:**
- Não distorcer, recolorir ou recortar nenhum elemento da marca
- Área de proteção mínima: equivalente à altura da letra "P" da sigla PAT em todas as direções
- Não aplicar efeitos de sombra, gradiente ou contorno sobre o logo

---

## 6.2 Paleta de Cores

A paleta foi definida com base na identidade da Prefeitura de Jaú. O azul é a cor primária, funcionando como elo entre a marca institucional e a interface digital. As cores funcionais (verde, laranja, vermelho) são usadas exclusivamente para comunicar estados do sistema.

| Amostra | Nome | HEX | RGB | Uso Principal |
|---|---|---|---|---|
| 🟦 | Azul Sidebar | `#01387F` | rgb(1, 56, 127) | Fundo da navegação lateral |
| 🔵 | Azul Primário | `#1565C0` | rgb(21, 101, 192) | Botões CTA, ênfase máxima |
| 🟣 | Azul Foco | `#073572` | rgb(7, 53, 114) | Texto principal |
| ⬜ | Cinza Médio | `#607D8B` | rgb(96, 125, 139) | Texto secundário, labels |
| ⬜ | Branco Acinzentado | `#ECEFF1` | rgb(236, 239, 241) | Bordas, separadores, linhas alternadas |
| ⬜ | Branco | `#F1F1F1` | rgb(241, 241, 241) | Fundo base, superfícies |
| 🟢 | Verde | `#2C9D32` | rgb(44, 157, 50) | Status Concluído / sucesso |
| 🟠 | Laranja | `#FF7B00` | rgb(255, 123, 0) | Status Pendente / alerta |
| 🔴 | Vermelho | `#C41C1C` | rgb(196, 28, 28) | Erro / ação destrutiva |

**Regras de aplicação:**
- `#01387F` — exclusivo para o fundo da sidebar; nunca usado em outros elementos
- `#1565C0` — botão principal "Exportar PDF/XLSX", indicadores ativos, ênfase máxima
- Cores funcionais (verde, laranja, vermelho) — apenas para badges de status; nunca decorativamente

---

## 6.3 Tipografia

O sistema utiliza **Inter** como fonte principal — desenvolvida especialmente para interfaces digitais, com excelente legibilidade em tamanhos pequenos. Para valores numéricos em tabelas e campos de protocolo, utiliza-se **Roboto Mono**, garantindo alinhamento perfeito em colunas de dados.

| Elemento | Fonte | Peso | Cor |
|---|---|---|---|
| Título da Página | Inter | Bold | `#1565C0` |
| Título de Seção | Inter | SemiBold | `#1565C0` |
| Label / Subtítulo | Inter | Medium | `#263238` |
| Corpo / Conteúdo | Inter | Regular | `#263238` |
| Texto Secundário | Inter | Regular | `#607D8B` |
| Botão Principal | Inter | SemiBold | `#FFFFFF` |
| Destaque | Inter | Bold | `#263238` |
| Valor de Gráfico | Inter | Regular | `#607D8B` |
| Protocolo / ID | Roboto Mono | Regular | `#263238` |
| Caption / Legenda | Inter | Regular | `#607D8B` |

---

## 6.4 Interface Desktop

### Estrutura de Layout

A interface desktop adota layout de duas colunas fixas: sidebar de navegação à esquerda (**243px**, fundo `#01387F`) e área de conteúdo principal à direita, com fundo branco e padding de 24px. A área de conteúdo utiliza grid interno de 12 colunas com gutter de 20px.

- **Sidebar (243px):** logo no topo, menu principal ao centro, utilitários no rodapé
- **Header do conteúdo:** título da página + subtítulo descritivo + botão de exportação
- **Filtros globais:** Período (date picker), Categoria (dropdown) e Setor (dropdown)
- **Área de KPIs:** 3 cards em linha, ocupando 100% da largura
- **Área de gráficos:** 2 colunas — gráfico de barras (60%) e pizza (40%)
- **Tabela de atendimentos recentes** e gráfico de barras horizontais por setor

### Telas Desenvolvidas

#### Tela de Login

Tela de entrada com fundo fotográfico do Paço Municipal de Jaú. À esquerda, apresentação do sistema com os diferenciais (Seguro, Confiável, Eficiente) e o fluxo de uso em três etapas (Login → Excel → Resultados). À direita, card central com brasão da Prefeitura, campos de usuário e senha, e botão "Entrar".

#### Tela de Upload

Tela de envio de arquivos com sidebar simplificada (itens: Upload e Análise). Área principal com dropzone para arrastar planilhas `.xlsx` ou `.csv`, botão "Selecionar Arquivo" e informações de segurança e limites de tamanho (até 50MB). O fluxo é guiado por etapas numeradas: 1. Upload → 2. Análise.

#### Dashboard Principal

Tela central do sistema, reunindo todos os indicadores de desempenho em uma única visão. A hierarquia visual conduz o olhar do gestor: **filtros → KPIs → gráficos analíticos → tabela de recentes**.

**Componentes presentes:**
- Cards de KPI (Total de Registros, Média de Processamento, Taxa de Conclusão)
- Gráfico de barras vertical — Atendimentos por Mês
- Gráfico de pizza — Tipos de Solicitação
- Tabela de Atendimentos Recentes
- Gráfico de barras horizontais — Atendimentos por Setor

#### Sidebar de Navegação

A navegação lateral é fixa e permanente em todas as telas. Estrutura:

- **Topo:** logo PAT com brasão da Prefeitura de Jaú e descritivo do sistema
- **Menu principal:** Dashboard · Atendimentos · Solicitações · Candidatos · Empresas · Vagas · Relatórios · Usuários · Configurações
- **Rodapé:** Ajuda · Sair

Item ativo é destacado com fundo semitransparente mais claro e ícone/texto brancos. Item hover recebe fundo sutil para feedback visual imediato.

---

## 6.5 Padrões de Componentes UI

### Botões

| Tipo | Estilo |
|---|---|
| Primário | Fundo `#1565C0`, texto branco, border-radius 6px, altura 40px, ícone opcional à esquerda |
| Secundário | Fundo branco, borda `#1565C0`, texto `#1565C0` — para ações secundárias |
| Link | Texto `#1E88E5`, sem fundo — ex: "Ver todos os atendimentos →" |
| Destrutivo | Fundo `#C62828`, texto branco — exclusivo para ações irreversíveis com confirmação |

### Cards de KPI

- Fundo branco com sombra suave: `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`
- Ícone circular à esquerda: fundo `#E3F2FD`, ícone em azul secundário
- Valor principal: 28px Bold — máxima hierarquia visual
- Variação percentual: verde (↑) para positivo, laranja/vermelho (↓) para negativo
- Ícone ⓘ no canto superior direito — tooltip com detalhes

### Tabelas de Dados

- Cabeçalho: fundo `#E3F2FD`, texto `#1E88E5` Bold, altura 44px
- Linhas: alternância branco / `#F8FBFF` para facilitar leitura em longas listagens
- Status com badges coloridos: "Concluído" (verde), "Pendente" (laranja), "Em Andamento" (azul)
- Colunas numéricas (protocolo, data) em Roboto Mono

### Filtros e Campos

- Date picker com ícone de calendário, formato `dd/mm/aaaa – dd/mm/aaaa`
- Dropdowns com borda `#ECEFF1`, chevron à direita, opção "Todos" como default
- Botão "Limpar filtros" em estilo link, com ícone de refresh — posicionado à direita dos filtros

### Gráficos

- Paleta: variações de azul (`#1565C0`, `#1E88E5`, `#42A5F5`, `#90CAF9`, `#BBDEFB`) para manter coesão
- Gráfico de pizza: 6 segmentos com legenda lateral, total exibido centralizado no anel
- Gráfico de barras vertical: eixo Y com gridlines sutis (`#ECEFF1`), sem borda de eixo
- Gráfico de barras horizontal: barras em `#1E88E5`, fundo branco, labels à esquerda
- Todos os gráficos possuem dropdown para alternar entre métricas (ex: Total / Porcentagem)

# 7. Protótipo

O protótipo funcional foi desenvolvido no Figma, seguindo as diretrizes documentadas no planejamento de design — paleta de cores, tipografia, componentes UI e estrutura de layout.

Ele contempla as três telas principais do sistema: **Login**, **Upload de Planilhas** e **Dashboard**, navegáveis de forma interativa.

🔗 [Acessar protótipo no Figma](https://www.figma.com/design/ZZRdzNGB8vgid1ftVsOAIB/PAT---Prot%C3%B3tipo?node-id=0-1&t=rgjo9S2z6Z6iV4uh-1)

# 8. Aplicação
