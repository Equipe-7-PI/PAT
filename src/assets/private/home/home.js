//? =============== Logica de upar planilha ===============
//? A ideia aqui e simples:
//? 1. O usuario escolhe/arrasta arquivos.
//? 2. O navegador guarda esses arquivos dentro da variavel selectedFiles.
//? 3. O JS redesenha a area de upload em formato de tabela.
//? 4. Nada vai para o servidor ainda. Isso so vai acontecer quando existir o botao de processar/finalizar.

const fileInput = document.querySelector("#file-upload"); //* <-- Input real que abre o seletor de arquivos
const dropZone = document.querySelector(".upload-dropzone"); //* <-- Area onde o usuario pode arrastar e soltar arquivos
const filesDiv = document.querySelector("#upload-files"); //* <-- Area visual onde a tabela de arquivos aparece
const uploadCard = document.querySelector(".upload-card"); //* <-- Card que troca do upload para o loading
const processingTemplate = document.querySelector("#processing-template"); //* <-- Marcacao da tela de loading
const dashboardTemplate = document.querySelector("#dashboard-template"); //* <-- Marcacao do dashboard final

const MAX_FILES = 10; //* <-- Limite maximo de planilhas por envio. Mais que isso ja vira bagunca.
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; //* <-- 50 MB no total, contando todas as planilhas juntas.
const ALLOWED_FILE_EXTENSIONS = ["xls", "xlsx", "csv"]; //* <-- Extensoes aceitas. Se nao for planilha, nem entra na festa.

let selectedFiles = []; //* <-- Aqui ficam armazenadas as planilhas enquanto a pagina estiver aberta
let dragDepth = 0; //* <-- Conta quantas camadas internas da dropzone o mouse atravessou durante o drag
let isValidatingFiles = false; //* <-- Evita duas validacoes de conteudo concorrendo entre si
let isUploadingFiles = false; //* <-- Impede o envio duplicado pelo mesmo botao
let activeEventSource = null; //* <-- Conexao SSE ativa durante o processamento
let dashboardVacancies = []; //* <-- Lista plana usada pelos filtros, graficos e tabela
let dashboardFilteredVacancies = []; //* <-- Recorte atual depois dos filtros

//? Soma o tamanho de todos os arquivos selecionados.
//? Isso ajuda a garantir que o usuario nao tente mandar uma enciclopedia em formato XLS.
function getSelectedFilesTotalSize() {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
}

//? Exibe mensagens simples de validacao.
//? Por enquanto usamos alert porque resolve sem criar mais HTML. Depois da para trocar por toast/modal bonitinho.
function showUploadValidationMessage(message) {
    alert(message);
}

//? Verifica se o arquivo tem uma extensao permitida.
//? O accept do HTML ajuda, mas nao e seguranca de verdade. O JS tambem precisa conferir.
function isAllowedSpreadsheetFile(file) {
    const extension = getFileExtension(file.name).toLowerCase();

    return ALLOWED_FILE_EXTENSIONS.includes(extension);
}

//? Monta um texto bonitinho com as extensoes permitidas.
//? Exemplo: ".xls, .xlsx, .csv"
function getAllowedExtensionsLabel() {
    return ALLOWED_FILE_EXTENSIONS
        .map(extension => `.${extension}`)
        .join(", ");
}

//? Valida o conteudo interno da planilha antes de adiciona-la a lista.
async function validateSpreadsheetContent(file) {
    const validator = window.PATSpreadsheetValidator;

    if (!validator?.validateFile) {
        return {
            ok: false,
            errors: ["O validador de planilhas nao foi carregado."],
        };
    }

    return validator.validateFile(file);
}

function formatSpreadsheetValidationErrors(fileName, errors) {
    const visibleErrors = errors.slice(0, 5);
    const remainingErrors = errors.length - visibleErrors.length;
    const lines = visibleErrors.map(error => `- ${error}`);

    if (remainingErrors > 0) {
        lines.push(`- E mais ${remainingErrors} erro(s).`);
    }

    return `${fileName}:\n${lines.join("\n")}`;
}

//? Funcao para adicionar arquivos dentro de selectedFiles
async function addFiles(fileList) {
    if (isValidatingFiles) {
        showUploadValidationMessage("Aguarde a validacao das planilhas atuais.");
        return;
    }

    isValidatingFiles = true;

    //? fileList vem do input.files ou do event.dataTransfer.files.
    //? Ele parece uma array, mas nao e uma array de verdade, entao convertemos com Array.from.
    const files = Array.from(fileList);
    let totalSize = getSelectedFilesTotalSize();
    let blockedByType = false;
    let blockedByQuantity = false;
    let blockedBySize = false;
    let blockedByDuplicate = false;
    const contentValidationErrors = [];

    try {
        for (const file of files) {
            //? Regra 0: so aceita extensoes de planilha.
            if (!isAllowedSpreadsheetFile(file)) {
                blockedByType = true;
                continue;
            }

            //? Regra 1: nao passa de 10 arquivos no total.
            if (selectedFiles.length >= MAX_FILES) {
                blockedByQuantity = true;
                continue;
            }

            //? Regra 2: nao passa de 50 MB somando todos os arquivos.
            if (totalSize + file.size > MAX_TOTAL_SIZE) {
                blockedBySize = true;
                continue;
            }

            const alreadyExists = selectedFiles.some(existingFile =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
            );

            if (alreadyExists) {
                blockedByDuplicate = true;
                continue;
            }

            const validation = await validateSpreadsheetContent(file);

            if (!validation.ok) {
                contentValidationErrors.push(
                    formatSpreadsheetValidationErrors(file.name, validation.errors),
                );
                continue;
            }

            selectedFiles.push(file);
            totalSize += file.size;
        }
    } finally {
        isValidatingFiles = false;
    }

    //? Feedback para o usuario entender por que algum arquivo nao apareceu na tabela.
    //? Sem isso parece que o sistema simplesmente "ignorou" o arquivo, e ai nasce a desconfiança.
    if (blockedByType) {
        showUploadValidationMessage(`Apenas arquivos de planilha sao permitidos: ${getAllowedExtensionsLabel()}.`);
    }

    if (blockedByQuantity) {
        showUploadValidationMessage(`Voce pode selecionar no maximo ${MAX_FILES} planilhas por envio.`);
    }

    if (blockedBySize) {
        showUploadValidationMessage(`O tamanho total das planilhas nao pode passar de ${formatFileSize(MAX_TOTAL_SIZE)}.`);
    }

    if (blockedByDuplicate) {
        showUploadValidationMessage("Uma ou mais planilhas ja estavam selecionadas e foram ignoradas.");
    }

    if (contentValidationErrors.length > 0) {
        showUploadValidationMessage(
            `Planilhas rejeitadas por conteudo invalido:\n\n${contentValidationErrors.join("\n\n")}`,
        );
    }
}

//? Funcao para atualizar o campo das planilhas
function renderSelectedFiles() {
    //? Se nao tiver nenhum arquivo, volta para o visual inicial da dropzone.
    //? Basicamente: "finge que nada aconteceu", que nesse caso e exatamente o que a gente quer.
    if (selectedFiles.length === 0) {
        showEmptyUploadState();
        return;
    }

    //? Se houver pelo menos uma planilha, exibe a tabela com os arquivos selecionados.
    showFilesState();
}

//? Funcao para remover um unico arquivo de dentro dos arquivos selecionados
function removeFile(index) {
    //? O index vem do botao de lixeira da tabela.
    //? Se vier algo estranho, a gente simplesmente ignora. Sem show de horrores no console.
    if (Number.isNaN(index) || index < 0 || index >= selectedFiles.length) return;

    selectedFiles.splice(index, 1); //* <-- Remove exatamente 1 arquivo a partir da posicao informada
    renderSelectedFiles(); //? Redesenha a tabela, ou volta para o estado vazio se nao sobrou nada
}

//? Funcao para limpar completamente a variavel de arquivos selecionados
function clearFiles() {
    selectedFiles = []; //* <-- Define como nada para poder limpar tudo
    renderSelectedFiles(); //? Chama a funcao que redesenha o campo das planilhas
}

//? Verifica se o usuario esta arrastando arquivos de verdade.
//? Isso evita ativar o visual de upload quando a pessoa so esta selecionando texto, arrastando link, etc.
function isDraggingFiles(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

//? Liga o estado visual de "pode soltar aqui".
//? A animacao em si fica no CSS, porque JS cuidando de layout e animacao junto vira novela.
function showDragState() {
    //? Classe no body para criar aquele efeito "Google Drive":
    //? a pagina inteira fica desfocada e a dropzone vira o palco principal.
    document.body.classList.add("upload-page--dragover");
    dropZone.classList.add("upload-dropzone--dragover");
}

//? Desliga o estado visual de drag.
//? Tambem zera o contador para nao deixar a dropzone presa no modo "recebendo arquivo".
function hideDragState() {
    dragDepth = 0;
    document.body.classList.remove("upload-page--dragover");
    dropZone.classList.remove("upload-dropzone--dragover");
}

//? Formata o tamanho do arquivo para ficar legivel para humanos normais.
//? O navegador entrega o tamanho em bytes, mas ninguem merece ler "16896" seco na tela.
function formatFileSize(size) {
    if (size < 1024) return `${size} B`;

    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;

    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;

    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
}

//? Captura a extensao do arquivo para exibir na coluna "Tipo".
//? Exemplo: "relatorio.xlsx" vira "XLSX".
function getFileExtension(fileName) {
    if (typeof fileName !== "string") return "";

    const lastDotIndex = fileName.lastIndexOf(".");

    //? Se nao tiver ponto, nao tem extensao. Misterio resolvido.
    if (lastDotIndex === -1) return "";

    return fileName.slice(lastDotIndex + 1).toUpperCase();
}

//? Captura o nome do arquivo sem a extensao para exibir na coluna "Arquivo".
//? Exemplo: "Consulta Abril.xlsx" vira "Consulta Abril".
function getFileNameWithoutExtension(fileName) {
    if (typeof fileName !== "string") return "";

    const lastDotIndex = fileName.lastIndexOf(".");

    //? Se nao tiver extensao, mostra o nome inteiro mesmo.
    if (lastDotIndex === -1) return fileName;

    return fileName.slice(0, lastDotIndex);
}

//? Pequena protecao para evitar que caracteres do nome do arquivo sejam interpretados como HTML.
//? Provavelmente nao vai acontecer nada bizarro, mas deixar blindado custa pouco.
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDashboardNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
}

function formatDashboardPercent(value) {
    if (!Number.isFinite(value)) return "0%";

    return `${value.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    })}%`;
}

function safeDashboardText(value, fallback = "Não informado") {
    return value === null || value === undefined || value === ""
        ? fallback
        : String(value);
}

function isDashboardMonthKey(value) {
    return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function maskDashboardCpf(documentValue) {
    return String(documentValue).replace(
        /^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/,
        "***.$2.***-**",
    );
}

function getDashboardDocumentLabel(type, documentValue) {
    if (type === "CPF") return `CPF ${maskDashboardCpf(documentValue)}`;
    return `CNPJ ${documentValue}`;
}

function getDashboardStatusLabel(status) {
    const labels = {
        ABERTA: "Aberta",
        PREENCHIDA_PAT: "Preenchida pelo PAT",
        PREENCHIDA_FORA: "Preenchida por outras fontes",
        CANCELADA: "Cancelada",
        SUSPENSA: "Suspensa",
        EXPIRADA: "Expirada",
        DESCONHECIDO: "Desconhecido",
    };

    return labels[status] ?? "Não informado";
}

function getDashboardStatusIcon(status) {
    const icons = {
        ABERTA: "bi-hourglass-split",
        PREENCHIDA_PAT: "bi-check-circle",
        PREENCHIDA_FORA: "bi-arrow-up-right-circle",
        CANCELADA: "bi-x-circle",
        SUSPENSA: "bi-pause-circle",
        EXPIRADA: "bi-clock-history",
        DESCONHECIDO: "bi-question-circle",
    };

    return icons[status] ?? "bi-question-circle";
}

function formatDashboardPeriodLabel(value) {
    const label = safeDashboardText(value, "Não identificado");
    const monthKey = /^(\d{4})-(\d{2})$/.exec(label);
    const monthsByNumber = {
        "01": "Jan",
        "02": "Fev",
        "03": "Mar",
        "04": "Abr",
        "05": "Mai",
        "06": "Jun",
        "07": "Jul",
        "08": "Ago",
        "09": "Set",
        "10": "Out",
        "11": "Nov",
        "12": "Dez",
    };
    const monthsByName = {
        janeiro: "Jan",
        fevereiro: "Fev",
        marco: "Mar",
        abril: "Abr",
        maio: "Mai",
        junho: "Jun",
        julho: "Jul",
        agosto: "Ago",
        setembro: "Set",
        outubro: "Out",
        novembro: "Nov",
        dezembro: "Dez",
    };

    if (monthKey) {
        return `${monthsByNumber[monthKey[2]] ?? monthKey[2]}/${monthKey[1]}`;
    }

    const normalizedLabel = label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const year = label.match(/\b(19|20)\d{2}\b/)?.[0];
    const monthName = Object.keys(monthsByName).find(name => normalizedLabel.includes(name));

    if (!monthName) return label;

    return year
        ? `${monthsByName[monthName]}/${year}`
        : monthsByName[monthName];
}

function getDashboardSectorData(employer) {
    const company = employer?.empresa ?? {};
    const cnae = employer?.cnae ?? null;

    if (company.tipoDocumento === "CPF") {
        return {
            key: "CPF",
            label: "Sem CNAE - Pessoa física",
            cnaeLabel: "Não aplicável",
            participatesInCnae: false,
        };
    }

    if (!cnae?.divisaoCodigo || !cnae?.divisaoNome) {
        return {
            key: "CNPJ_SEM_CNAE",
            label: "CNPJ sem CNAE informado",
            cnaeLabel: "Não informado",
            participatesInCnae: false,
        };
    }

    return {
        key: `CNAE_${cnae.divisaoCodigo}`,
        label: `${cnae.divisaoCodigo} - ${cnae.divisaoNome}`,
        cnaeLabel: cnae.codigoFormatado ?? cnae.codigo ?? "Não informado",
        participatesInCnae: true,
    };
}

function flattenDashboardResult(result) {
    const periods = result?.dadosPorPeriodo ?? {};
    const vacancies = [];

    Object.entries(periods).forEach(([periodKey, periodData]) => {
        const period = periodData?.periodo ?? {};

        ["cnpjs", "cpfs"].forEach(groupName => {
            const employers = periodData?.[groupName] ?? {};

            Object.values(employers).forEach(employer => {
                const company = employer?.empresa ?? {};
                const sector = getDashboardSectorData(employer);
                const documentType = company.tipoDocumento ?? (groupName === "cpfs" ? "CPF" : "CNPJ");
                const documentValue = company.documento ?? "";
                const displayName = company.nomeExibicao || documentValue || "Solicitante não informado";

                (employer?.vagas ?? []).forEach(vacancy => {
                    const requestedPosts = Number(vacancy?.quantidades?.postosSolicitados) || 0;
                    const status = vacancy?.statusNormalizado ?? "DESCONHECIDO";

                    vacancies.push({
                        periodKey,
                        periodLabel: formatDashboardPeriodLabel(period.label ?? periodKey),
                        periodIdentified: Boolean(period.identified),
                        periodStartDate: period.startDate ?? null,
                        documentType,
                        documentValue,
                        documentLabel: getDashboardDocumentLabel(documentType, documentValue),
                        companyName: displayName,
                        companyOrigin: company.origem ?? "planilha",
                        sectorKey: sector.key,
                        sectorLabel: sector.label,
                        cnaeLabel: sector.cnaeLabel,
                        cnaeCode: employer?.cnae?.codigo ?? null,
                        cnaeDivision: employer?.cnae?.divisaoCodigo ?? null,
                        vacancyCode: vacancy?.codigoVaga ?? "",
                        occupationCode: vacancy?.codigoOcupacao ?? "",
                        occupationDescription: vacancy?.descricaoOcupacao ?? "Ocupação não informada",
                        statusOriginal: vacancy?.statusOriginal ?? "Não informado",
                        status,
                        statusLabel: getDashboardStatusLabel(status),
                        statusCategory: vacancy?.categoriaStatus ?? "DESCONHECIDA",
                        requestedPosts,
                        filledByPatPosts: status === "PREENCHIDA_PAT" ? requestedPosts : 0,
                        filledOutsidePosts: status === "PREENCHIDA_FORA" ? requestedPosts : 0,
                        expiredPosts: status === "EXPIRADA" ? requestedPosts : 0,
                        canceledPosts: status === "CANCELADA" ? requestedPosts : 0,
                        dueDate: vacancy?.datas?.vencimento ?? null,
                        sourceFile: vacancy?.origem?.nomeArquivo ?? "Não informado",
                        sourceSheet: vacancy?.origem?.nomeAba ?? "Não informado",
                        sourceCriteria: vacancy?.origem?.criterio ?? "",
                        reasonCategory: vacancy?.motivoNaoPreenchimento?.categoria ?? "NAO_INFORMADO",
                        reasonDescription: vacancy?.motivoNaoPreenchimento?.descricao ?? "Motivo não informado",
                    });
                });
            });
        });
    });

    return vacancies.sort((a, b) =>
        a.periodKey.localeCompare(b.periodKey) ||
        a.companyName.localeCompare(b.companyName) ||
        a.vacancyCode.localeCompare(b.vacancyCode),
    );
}

function sumDashboardPosts(items, selector = item => item.requestedPosts) {
    return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

function groupDashboardPosts(items, getKey, getLabel = getKey) {
    const grouped = new Map();

    items.forEach(item => {
        const key = getKey(item);
        const current = grouped.get(key) ?? {
            key,
            label: getLabel(item),
            posts: 0,
            records: 0,
        };

        current.posts += item.requestedPosts;
        current.records += 1;
        grouped.set(key, current);
    });

    return [...grouped.values()].sort((a, b) => b.posts - a.posts || a.label.localeCompare(b.label));
}

function getDashboardFilteredVacancies() {
    const start = document.querySelector("#dashboard-start-period")?.value;
    const end = document.querySelector("#dashboard-end-period")?.value;
    const sector = document.querySelector("#dashboard-sector-filter")?.value ?? "all";
    const status = document.querySelector("#dashboard-status-filter")?.value ?? "all";
    const documentType = document.querySelector("#dashboard-document-filter")?.value ?? "all";
    const search = (document.querySelector("#dashboard-search")?.value ?? "").trim().toLowerCase();

    return dashboardVacancies.filter(item => {
        const periodOk = !isDashboardMonthKey(item.periodKey) ||
            ((!start || item.periodKey >= start) && (!end || item.periodKey <= end));
        const sectorOk = sector === "all" || item.sectorKey === sector;
        const statusOk = status === "all" || item.status === status;
        const documentOk = documentType === "all" || item.documentType === documentType;
        const searchOk = !search || [
            item.companyName,
            item.documentValue,
            item.documentLabel,
            item.occupationDescription,
            item.occupationCode,
            item.vacancyCode,
            item.sectorLabel,
            item.statusOriginal,
        ].some(value => String(value ?? "").toLowerCase().includes(search));

        return periodOk && sectorOk && statusOk && documentOk && searchOk;
    });
}

function initializeDashboardFilters() {
    const periodKeys = [...new Set(
        dashboardVacancies
            .map(item => item.periodKey)
            .filter(isDashboardMonthKey),
    )].sort();
    const sectors = groupDashboardPosts(
        dashboardVacancies,
        item => item.sectorKey,
        item => item.sectorLabel,
    ).sort((a, b) => a.label.localeCompare(b.label));

    const startInput = document.querySelector("#dashboard-start-period");
    const endInput = document.querySelector("#dashboard-end-period");
    const sectorSelect = document.querySelector("#dashboard-sector-filter");

    if (periodKeys.length > 0) {
        startInput.value = periodKeys[0];
        endInput.value = periodKeys[periodKeys.length - 1];
        startInput.min = periodKeys[0];
        startInput.max = periodKeys[periodKeys.length - 1];
        endInput.min = periodKeys[0];
        endInput.max = periodKeys[periodKeys.length - 1];
    }

    sectorSelect.innerHTML = `
        <option value="all">Todos os setores</option>
        ${sectors.map(sector => `
            <option value="${escapeHtml(sector.key)}">${escapeHtml(sector.label)}</option>
        `).join("")}
    `;
}

function getDashboardTotals(items) {
    const requested = sumDashboardPosts(items);
    const pat = sumDashboardPosts(items, item => item.filledByPatPosts);
    const outside = sumDashboardPosts(items, item => item.filledOutsidePosts);
    const withoutCnaePosts = sumDashboardPosts(
        items.filter(item => item.sectorKey === "CPF" || item.sectorKey === "CNPJ_SEM_CNAE"),
    );
    const employers = new Set(items.map(item => `${item.documentType}:${item.documentValue}`));
    const cpfs = new Set(items.filter(item => item.documentType === "CPF").map(item => item.documentValue));
    const cnpjs = new Set(items.filter(item => item.documentType === "CNPJ").map(item => item.documentValue));

    return {
        records: items.length,
        requested,
        pat,
        outside,
        withoutCnaePosts,
        employers: employers.size,
        cpfs: cpfs.size,
        cnpjs: cnpjs.size,
        patRate: requested > 0 ? (pat / requested) * 100 : 0,
    };
}

function renderDashboardKpis(items) {
    const totals = getDashboardTotals(items);
    const kpis = [
        {
            icon: "bi-folder-check",
            label: "Registros de vaga",
            value: formatDashboardNumber(totals.records),
            note: "códigos importados",
            tone: "blue",
            progress: Math.min(100, totals.records),
        },
        {
            icon: "bi-people",
            label: "Postos solicitados",
            value: formatDashboardNumber(totals.requested),
            note: "soma do número de vagas",
            tone: "sky",
            progress: Math.min(100, totals.requested),
        },
        {
            icon: "bi-patch-check",
            label: "Preenchidos pelo PAT",
            value: formatDashboardNumber(totals.pat),
            note: "conforme status da planilha",
            tone: "mid",
            progress: totals.patRate,
        },
        {
            icon: "bi-arrow-up-right-circle",
            label: "Outras fontes",
            value: formatDashboardNumber(totals.outside),
            note: "preenchidos fora do PAT",
            tone: "light",
            progress: totals.requested > 0 ? (totals.outside / totals.requested) * 100 : 0,
        },
        {
            icon: "bi-building",
            label: "Solicitantes",
            value: formatDashboardNumber(totals.employers),
            note: `${totals.cnpjs} CNPJs · ${totals.cpfs} CPFs`,
            tone: "steel",
            progress: Math.min(100, totals.employers),
        },
        {
            icon: "bi-slash-circle",
            label: "Sem CNAE",
            value: formatDashboardNumber(totals.withoutCnaePosts),
            note: "CPF ou CNPJ sem retorno",
            tone: "muted",
            progress: totals.requested > 0 ? (totals.withoutCnaePosts / totals.requested) * 100 : 0,
        },
    ];

    document.querySelector("#dashboard-kpis").innerHTML = kpis.map(kpi => `
        <article class="dashboard-kpi dashboard-kpi--${escapeHtml(kpi.tone)}">
            <span class="dashboard-kpi__icon"><i class="bi ${escapeHtml(kpi.icon)}" aria-hidden="true"></i></span>
            <div>
                <span>${escapeHtml(kpi.label)}</span>
                <strong>${escapeHtml(kpi.value)}</strong>
                <small>${escapeHtml(kpi.note)}</small>
            </div>
            <span class="dashboard-kpi__bar"><i style="width: ${Math.min(100, Math.max(6, kpi.progress))}%"></i></span>
        </article>
    `).join("");
}

function renderDashboardMonthlyChart(items) {
    const monthly = groupDashboardPosts(
        items,
        item => item.periodKey,
        item => item.periodLabel,
    ).sort((a, b) => a.key.localeCompare(b.key));
    const container = document.querySelector("#dashboard-monthly-chart");

    if (monthly.length === 0) {
        container.innerHTML = '<p class="dashboard-muted">Sem dados para exibir.</p>';
        return;
    }

    const maxPosts = Math.max(1, ...monthly.map(item => item.posts));

    container.innerHTML = monthly.map(item => `
        <div class="dashboard-monthly-chart__item">
            <strong>${formatDashboardNumber(item.posts)}</strong>
            <span class="dashboard-monthly-chart__bar">
                <i style="height: ${Math.max(8, (item.posts / maxPosts) * 100)}%"></i>
            </span>
            <small>${escapeHtml(item.label)}</small>
        </div>
    `).join("");
}

function renderDashboardBarList(selector, groupedItems, emptyText = "Sem dados para exibir.") {
    const container = document.querySelector(selector);
    const maxPosts = Math.max(1, ...groupedItems.map(item => item.posts));

    if (groupedItems.length === 0) {
        container.innerHTML = `<p class="dashboard-muted">${escapeHtml(emptyText)}</p>`;
        return;
    }

    container.innerHTML = groupedItems.map(item => `
        <div class="dashboard-bar-row">
            <div class="dashboard-bar-row__head">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${formatDashboardNumber(item.posts)} postos</span>
            </div>
            <span class="dashboard-bar-row__track">
                <i style="width: ${Math.max(4, (item.posts / maxPosts) * 100)}%"></i>
            </span>
        </div>
    `).join("");
}

function renderDashboardStatusChart(items) {
    const statusItems = groupDashboardPosts(
        items,
        item => item.status,
        item => item.statusLabel,
    ).map(item => ({
        ...item,
        label: `${item.label}`,
    }));

    renderDashboardBarList("#dashboard-status-chart", statusItems);
}

function renderDashboardSectorChart(items) {
    renderDashboardBarList(
        "#dashboard-sector-chart",
        groupDashboardPosts(items, item => item.sectorKey, item => item.sectorLabel).slice(0, 8),
    );
}

function renderDashboardReasonList(items) {
    const situations = groupDashboardPosts(
        items,
        item => item.statusOriginal,
        item => item.statusOriginal,
    ).slice(0, 7);
    const container = document.querySelector("#dashboard-reason-list");
    const maxPosts = Math.max(1, ...situations.map(item => item.posts));

    if (situations.length === 0) {
        container.innerHTML = '<p class="dashboard-muted">Sem dados para exibir.</p>';
        return;
    }

    container.innerHTML = situations.map(item => `
        <div class="dashboard-reason-item">
            <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${item.label.toLowerCase().includes("expirado")
                    ? "A planilha informa expiração, mas não informa o motivo real."
                    : "Classificação baseada apenas no status informado."}</p>
            </div>
            <span>${formatDashboardNumber(item.posts)}</span>
            <i style="width: ${Math.max(5, (item.posts / maxPosts) * 100)}%"></i>
        </div>
    `).join("");
}

function renderDashboardRanking(selector, groupedItems) {
    const container = document.querySelector(selector);

    if (groupedItems.length === 0) {
        container.innerHTML = `<p class="dashboard-muted">Sem dados para exibir.</p>`;
        return;
    }

    container.innerHTML = groupedItems.slice(0, 7).map((item, index) => `
        <div class="dashboard-ranking-item">
            <span>${index + 1}</span>
            <div>
                <strong>${escapeHtml(item.label)}</strong>
                <small>${formatDashboardNumber(item.records)} registro(s)</small>
            </div>
            <b>${formatDashboardNumber(item.posts)}</b>
        </div>
    `).join("");
}

function renderDashboardRankings(items) {
    renderDashboardRanking(
        "#dashboard-employer-ranking",
        groupDashboardPosts(
            items,
            item => `${item.documentType}:${item.documentValue}`,
            item => `${item.companyName} · ${item.documentType}`,
        ),
    );
    renderDashboardRanking(
        "#dashboard-occupation-ranking",
        groupDashboardPosts(
            items,
            item => item.occupationCode,
            item => item.occupationDescription,
        ),
    );
}

function renderDashboardTable(items) {
    const tbody = document.querySelector("#dashboard-vacancies-table");
    const emptyState = document.querySelector("#dashboard-empty-state");
    const count = document.querySelector("#dashboard-table-count");

    count.textContent = `${formatDashboardNumber(items.length)} registro(s)`;
    emptyState.classList.toggle("disable", items.length > 0);

    tbody.innerHTML = items.slice(0, 250).map(item => `
        <tr>
            <td>
                <strong>${escapeHtml(item.periodLabel)}</strong>
                <small>${escapeHtml(item.periodIdentified ? item.periodKey : "Não identificado")}</small>
            </td>
            <td class="dashboard-company-cell">
                <strong>${escapeHtml(item.companyName)}</strong>
                <small>${escapeHtml(item.documentLabel)}</small>
            </td>
            <td>
                <strong>${escapeHtml(item.occupationDescription)}</strong>
                <small>Vaga ${escapeHtml(item.vacancyCode)} · CBO ${escapeHtml(item.occupationCode)}</small>
            </td>
            <td>
                <strong>${escapeHtml(item.sectorLabel)}</strong>
                <small>${escapeHtml(item.cnaeLabel)}</small>
            </td>
            <td>
                <span class="dashboard-status dashboard-status--${escapeHtml(item.status)}">
                    <i class="bi ${escapeHtml(getDashboardStatusIcon(item.status))}" aria-hidden="true"></i>
                    ${escapeHtml(item.statusLabel)}
                </span>
                <small>${escapeHtml(item.statusOriginal)}</small>
            </td>
            <td><strong>${formatDashboardNumber(item.requestedPosts)}</strong></td>
            <td>
                <strong>${escapeHtml(safeDashboardText(item.dueDate))}</strong>
                <small>${escapeHtml(item.sourceFile)}</small>
            </td>
        </tr>
    `).join("");
}

function updateDashboard() {
    dashboardFilteredVacancies = getDashboardFilteredVacancies();
    renderDashboardKpis(dashboardFilteredVacancies);
    renderDashboardMonthlyChart(dashboardFilteredVacancies);
    renderDashboardStatusChart(dashboardFilteredVacancies);
    renderDashboardSectorChart(dashboardFilteredVacancies);
    renderDashboardReasonList(dashboardFilteredVacancies);
    renderDashboardRankings(dashboardFilteredVacancies);
    renderDashboardTable(dashboardFilteredVacancies);
}

function exportDashboardFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function exportDashboardCsv() {
    const headers = [
        "periodo_key",
        "periodo_label",
        "tipo_documento",
        "documento_tela",
        "empresa",
        "setor_dashboard",
        "cnae",
        "codigo_vaga",
        "codigo_ocupacao",
        "descricao_ocupacao",
        "status_original",
        "status_normalizado",
        "categoria_status",
        "postos_solicitados",
        "data_vencimento",
        "arquivo_origem",
    ];
    const rows = dashboardFilteredVacancies.map(item => [
        item.periodKey,
        item.periodLabel,
        item.documentType,
        item.documentLabel,
        item.companyName,
        item.sectorLabel,
        item.cnaeLabel,
        item.vacancyCode,
        item.occupationCode,
        item.occupationDescription,
        item.statusOriginal,
        item.status,
        item.statusCategory,
        item.requestedPosts,
        safeDashboardText(item.dueDate),
        item.sourceFile,
    ].map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"));

    exportDashboardFile(
        "dashboard-pat-vagas-planilha.csv",
        `\ufeff${[headers.join(";"), ...rows].join("\n")}`,
        "text/csv;charset=utf-8",
    );
}

function wireDashboardEvents() {
    [
        "#dashboard-start-period",
        "#dashboard-end-period",
        "#dashboard-sector-filter",
        "#dashboard-status-filter",
        "#dashboard-document-filter",
        "#dashboard-search",
    ].forEach(selector => {
        document.querySelector(selector)?.addEventListener("input", updateDashboard);
    });

    document.querySelector("#dashboard-clear-filters")?.addEventListener("click", () => {
        initializeDashboardFilters();
        document.querySelector("#dashboard-status-filter").value = "all";
        document.querySelector("#dashboard-document-filter").value = "all";
        document.querySelector("#dashboard-search").value = "";
        updateDashboard();
    });

    document.querySelector("#dashboard-back-upload")?.addEventListener("click", () => {
        window.location.reload();
    });
    document.querySelector("#dashboard-export-csv")?.addEventListener("click", exportDashboardCsv);
}

function renderDashboard(result) {
    if (!(dashboardTemplate instanceof HTMLTemplateElement) || !uploadCard) {
        throw new Error("A estrutura do dashboard nao foi encontrada.");
    }

    dashboardVacancies = flattenDashboardResult(result);
    dashboardFilteredVacancies = dashboardVacancies;

    document.querySelector(".main")?.classList.remove("main--processing");
    document.querySelector(".main")?.classList.add("main--dashboard");
    document.querySelector(".steps")?.classList.add("steps--hidden");
    document.querySelector(".page-header")?.classList.add("page-header--hidden");

    uploadCard.classList.add("upload-card--dashboard");
    uploadCard.replaceChildren(dashboardTemplate.content.cloneNode(true));

    initializeDashboardFilters();
    wireDashboardEvents();
    updateDashboard();
}

//? Troca o conteudo do card pelo <template> definido em home.html.
//? O desenho fica no HTML/CSS e a logica abaixo apenas preenche os estados.
function showProcessingScreen(cnpjs) {
    if (!(processingTemplate instanceof HTMLTemplateElement) || !uploadCard) {
        throw new Error("A estrutura da tela de processamento nao foi encontrada.");
    }

    uploadCard.replaceChildren(processingTemplate.content.cloneNode(true));

    document.querySelector(".main")?.classList.add("main--processing");

    const steps = document.querySelectorAll(".steps__item");
    steps[0]?.classList.remove("steps__item--active");
    steps[0]?.classList.remove("steps__item--complete");
    steps[1]?.classList.add("steps__item--active");

    renderProcessingCnpjs(cnpjs);
    updateProcessingProgress(0, cnpjs.length, 0);

    document.querySelector("#processing-retry")?.addEventListener("click", () => {
        window.location.reload();
    });
}

function renderProcessingCnpjs(cnpjs) {
    const list = document.querySelector("#processing-cnpj-list");
    if (!list) return;

    list.innerHTML = cnpjs.map(cnpj => `
        <li class="processing-cnpj processing-cnpj--waiting" data-cnpj="${escapeHtml(cnpj)}">
            <span class="processing-cnpj__icon" aria-hidden="true">
                <i class="bi bi-three-dots"></i>
            </span>
            <span>
                <strong class="processing-cnpj__document">${escapeHtml(cnpj)}</strong>
                <span class="processing-cnpj__status">Aguardando...</span>
            </span>
        </li>
    `).join("");
}

function findProcessingCnpj(cnpj) {
    const items = document.querySelectorAll(".processing-cnpj");

    return Array.from(items).find(item => item.dataset.cnpj === cnpj) ?? null;
}

function getProcessingStatusIcon(status) {
    if (status === "success") return '<i class="bi bi-check-lg"></i>';
    if (status === "error") return '<i class="bi bi-x-lg"></i>';
    if (status === "waiting") return '<i class="bi bi-three-dots"></i>';

    //? No loading, o proprio circulo recebe a animacao de rotacao no CSS.
    return "";
}

function updateProcessingNotice(message, tone = "info") {
    const notice = document.querySelector("#processing-notice");
    const currentMessage = document.querySelector("#processing-current-message");
    if (!notice || !currentMessage) return;

    notice.classList.remove(
        "processing-notice--success",
        "processing-notice--error",
    );

    if (tone === "success") {
        notice.classList.add("processing-notice--success");
    } else if (tone === "error") {
        notice.classList.add("processing-notice--error");
    }

    currentMessage.textContent = message;
}

function updateCnpjProcessingStatus({ cnpj, status, message, cnaeType }) {
    const item = findProcessingCnpj(cnpj);
    if (!item) return;

    item.classList.remove(
        "processing-cnpj--waiting",
        "processing-cnpj--loading",
        "processing-cnpj--success",
        "processing-cnpj--error",
    );
    item.classList.add(`processing-cnpj--${status}`);

    const icon = item.querySelector(".processing-cnpj__icon");
    const statusText = item.querySelector(".processing-cnpj__status");

    if (icon) icon.innerHTML = getProcessingStatusIcon(status);
    if (statusText) statusText.textContent = message ?? status;

    if (typeof cnaeType === "string") {
        item.title = cnaeType;
    }

    if (status === "loading") {
        updateProcessingNotice(`Consultando dados do CNPJ ${cnpj}...`);
    } else if (status === "success") {
        updateProcessingNotice(`Consulta do CNPJ ${cnpj} concluída.`, "success");
    } else if (status === "error") {
        updateProcessingNotice(
            `Não foi possível consultar o CNPJ ${cnpj}. Continuando o processamento.`,
            "error",
        );
    }
}

function updateProcessingProgress(completed, total, percent) {
    const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
    const progress = document.querySelector("#processing-progress");
    const fill = document.querySelector("#processing-progress-fill");
    const percentText = document.querySelector("#processing-percent");
    const count = document.querySelector("#processing-count");

    if (fill) fill.style.width = `${safePercent}%`;
    if (percentText) percentText.textContent = `${safePercent}%`;
    if (count) count.textContent = `${completed} de ${total} CNPJs consultados`;

    progress?.setAttribute("aria-valuenow", String(safePercent));
}

function parseSsePayload(event) {
    try {
        const payload = JSON.parse(event.data);
        return typeof payload === "object" && payload !== null ? payload : null;
    } catch {
        console.error("O servidor enviou um evento SSE invalido.");
        return null;
    }
}

function finishProcessing(result) {
    const title = document.querySelector("#processing-title");
    const description = document.querySelector("#processing-description");

    if (title) title.textContent = "Processamento concluido";
    if (description) {
        description.textContent = result.cnpjsFailed > 0
            ? `Finalizado com ${result.cnpjsFailed} CNPJ(s) sem resultado.`
            : "Todos os CNPJs foram consultados com sucesso.";
    }
    updateProcessingNotice(
        result.cnpjsFailed > 0
            ? "Processamento concluído com algumas consultas sem resultado."
            : "Processamento concluído com sucesso.",
        result.cnpjsFailed > 0 ? "error" : "success",
    );

    updateProcessingProgress(
        result.cnpjsProcessed,
        result.cnpjsProcessed,
        100,
    );

    //? O dashboard podera consumir estes dados sem uma nova requisicao.
    window.PATDashboardData = result;
    document.dispatchEvent(new CustomEvent("pat:dashboard-data", {
        detail: result,
    }));

    console.log("Dados agrupados por periodo recebidos:", result.dadosPorPeriodo);
    renderDashboard(result);
}

function failProcessing(message) {
    const title = document.querySelector("#processing-title");
    const description = document.querySelector("#processing-description");
    const retryButton = document.querySelector("#processing-retry");

    if (title) title.textContent = "Nao foi possivel concluir";
    if (description) description.textContent = message;
    updateProcessingNotice(message, "error");
    retryButton?.classList.remove("disable");
}

//? EventSource reconecta automaticamente quando a rede oscila. O servidor
//? reapresenta o historico, portanto a tela recupera o estado sem perder CNPJs.
function connectToUploadEvents(statusUrl) {
    activeEventSource?.close();
    activeEventSource = new EventSource(statusUrl);

    activeEventSource.addEventListener("identified", event => {
        const payload = parseSsePayload(event);
        if (!payload || !Array.isArray(payload.cnpjs)) return;

        renderProcessingCnpjs(payload.cnpjs);
        updateProcessingProgress(0, payload.total, 0);
    });

    activeEventSource.addEventListener("cnpj-status", event => {
        const payload = parseSsePayload(event);
        if (!payload || typeof payload.cnpj !== "string") return;

        updateCnpjProcessingStatus(payload);
    });

    activeEventSource.addEventListener("progress", event => {
        const payload = parseSsePayload(event);
        if (!payload) return;

        updateProcessingProgress(
            payload.completed,
            payload.total,
            payload.percent,
        );
    });

    activeEventSource.addEventListener("complete", event => {
        const payload = parseSsePayload(event);
        if (!payload?.result) return;

        finishProcessing(payload.result);
        activeEventSource?.close();
        activeEventSource = null;
    });

    activeEventSource.addEventListener("processing-error", event => {
        const payload = parseSsePayload(event);

        failProcessing(
            typeof payload?.message === "string"
                ? payload.message
                : "O processamento foi interrompido.",
        );
        activeEventSource?.close();
        activeEventSource = null;
    });

    activeEventSource.onerror = () => {
        const description = document.querySelector("#processing-description");

        if (description && activeEventSource?.readyState !== EventSource.CLOSED) {
            description.textContent = "Reconectando ao servidor...";
            updateProcessingNotice(
                "Conexao interrompida. Tentando reconectar ao servidor...",
                "error",
            );
        }
    };
}

function isUploadAcceptedResponse(value) {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof value.processId === "string" &&
        typeof value.statusUrl === "string" &&
        Array.isArray(value.cnpjs) &&
        value.cnpjs.every(cnpj => typeof cnpj === "string")
    );
}

//? Funcao que volta a dropzone para o visual inicial, sem arquivos selecionados.
function showEmptyUploadState() {
    const iconXLSX = document.querySelector(".upload-dropzone__icon");
    const texts = document.querySelector(".upload-dropzone__text");
    const divider = document.querySelector(".upload-divider");
    const buttonUpFiles = document.querySelector(".upload-button");

    //? Mostra de novo o visual original: icone, texto, divisor e botao.
    dropZone.classList.remove("upload-dropzone--has-files");
    iconXLSX.classList.remove("disable");
    texts.classList.remove("disable");
    divider.classList.remove("disable");
    buttonUpFiles.classList.remove("disable");

    //? Esconde e limpa a area da tabela. Se nao limpar, fica aquele fantasma visual esperando a hora errada.
    filesDiv.innerHTML = "";
    filesDiv.classList.add("disable");
}

//? Funcao que exibe as planilhas no campo de planilhas
function showFilesState() {
    //? Captura o SVG da planilha
    const iconXLSX = document.querySelector(".upload-dropzone__icon");
    //? Captura os textos do campo
    const texts = document.querySelector(".upload-dropzone__text");
    //? Captura a divisoria
    const divider = document.querySelector(".upload-divider");
    //? Captura o botao de selecionar arquivos
    const buttonUpFiles = document.querySelector(".upload-button");

    //? Esconde o visual inicial para dar lugar para a tabela.
    dropZone.classList.add("upload-dropzone--has-files");
    iconXLSX.classList.add("disable");
    texts.classList.add("disable");
    divider.classList.add("disable");
    buttonUpFiles.classList.add("disable");

    //? Mostra a area que vai receber a tabela.
    filesDiv.classList.remove("disable");

    //? Monta a tabela inteira do zero.
    //? Isso evita duplicidade, porque a tela sempre nasce de selectedFiles, e nao do HTML antigo.
    let html = `
        <div class="upload-files-table-wrapper">
            <div class="upload-files-table-header">
                <strong>Planilhas selecionadas</strong>

                <div class="upload-files-table-actions">
                    <label for="file-upload" class="upload-files-add-table">
                        + Adicionar planilhas
                    </label>

                    <button type="button" class="upload-files-submit">
                        Enviar planilhas
                    </button>
                </div>
            </div>

            <table class="upload-files-table">
                <thead>
                    <tr>
                        <th>Arquivo</th>
                        <th>Tipo</th>
                        <th>Tamanho</th>
                        <th>Acoes</th>
                    </tr>
                </thead>
                <tbody>
    `;

    selectedFiles.forEach((file, index) => {
        const fileName = escapeHtml(getFileNameWithoutExtension(file.name));
        const fullFileName = escapeHtml(file.name);
        const fileType = escapeHtml(getFileExtension(file.name) || "ARQ");
        const fileSize = escapeHtml(formatFileSize(file.size));

        html += `
            <tr>
                <td class="upload-files-table__name" title="${fullFileName}">${fileName}</td>
                <td>
                    <span class="upload-files-table__type">${fileType}</span>
                </td>
                <td>${fileSize}</td>
                <td>
                    <button
                        type="button"
                        class="upload-file-remove"
                        data-index="${index}"
                        aria-label="Remover ${fullFileName}"
                        title="Remover planilha"
                    >
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    filesDiv.innerHTML = html;
}

//? Evento de quando o usuario seleciona arquivos pelo botao/input.
fileInput.addEventListener("change", async () => {
    await addFiles(fileInput.files);
    renderSelectedFiles(); //? Atualiza o campo

    //? Limpa o input para permitir selecionar o mesmo arquivo novamente depois.
    //? Sem isso, o navegador pode pensar "ue, mas esse arquivo ja estava selecionado" e nao disparar change.
    fileInput.value = "";

    console.log(selectedFiles); //? Exibe no console do navegador os arquivos selecionados
});

//? Dispara quando um arquivo entra na dropzone.
//? O dragenter pode disparar varias vezes ao passar por filhos internos, por isso usamos dragDepth.
dropZone.addEventListener("dragenter", (event) => {
    if (!isDraggingFiles(event)) return;

    event.preventDefault();
    dragDepth += 1;
    showDragState();
});

//? Cria o evento de quando esta com o mouse por cima e arrastando um arquivo.
dropZone.addEventListener("dragover", (event) => {
    if (!isDraggingFiles(event)) return;

    event.preventDefault(); //* <-- Isso evita o comportamento padrao do navegador, que pode abrir o arquivo na pagina
    event.dataTransfer.dropEffect = "copy"; //* <-- Mostra para o navegador que a ideia aqui e copiar/adicionar o arquivo
    showDragState();
});

//? Dispara quando o arquivo sai da dropzone.
//? O contador evita remover a animacao so porque o mouse passou de uma <td> para outra dentro da tabela.
dropZone.addEventListener("dragleave", (event) => {
    if (!isDraggingFiles(event)) return;

    dragDepth = Math.max(0, dragDepth - 1);

    if (dragDepth === 0) {
        hideDragState();
    }
});

//? Cria o evento de quando o usuario solta algum arquivo em cima do "dropZone" (area definida).
dropZone.addEventListener("drop", async (event) => {
    if (!isDraggingFiles(event)) return;

    event.preventDefault(); //* <-- Isso evita o comportamento padrao do navegador, que pode abrir o arquivo na pagina
    hideDragState();

    //? Como a tabela fica dentro da dropzone, soltar arquivos em cima dela tambem cai aqui.
    //? Ou seja: area vazia, tabela, cabecalho, linha... tudo vira zona de drop. Democracia do upload.
    await addFiles(event.dataTransfer.files); //? Valida e adiciona os arquivos a lista
    renderSelectedFiles(); //? Atualiza o campo
});

//? Se o usuario arrastar arquivo pela pagina, bloqueia o comportamento padrao global.
//? Sem isso, soltar fora da dropzone pode abrir o arquivo no navegador. A pagina some e todo mundo fica triste.
document.addEventListener("dragover", (event) => {
    if (!isDraggingFiles(event)) return;

    event.preventDefault();
});

//? Se o usuario soltar o arquivo fora da dropzone, nao adiciona nada,
//? mas tambem nao deixa o navegador abrir o arquivo por cima do sistema.
document.addEventListener("drop", (event) => {
    if (isDraggingFiles(event)) {
        event.preventDefault();
    }

    hideDragState();
});

//? Drag finalizado sem drop tambem precisa limpar a animacao.
document.addEventListener("dragend", hideDragState);

//? Quando clicado em "Enviar planilhas", ele vai seguir o seguinte fluxo:
//? Cria um FormData
//? Coloca todos os arquivos que estão no selectedFiles dentro do FormData
//? Envia o FormData com um fetch() para uma rota POST do bun que vai receber os arquivos e processar eles
async function uploadSelectedFiles() {
    if (isValidatingFiles) {
        showUploadValidationMessage("Aguarde a validacao das planilhas antes de enviar.");
        return;
    }

    if (isUploadingFiles) return;

    if (selectedFiles.length === 0) {
        showUploadValidationMessage("Selecione pelo menos uma planilha valida.");
        return;
    }

    const formData = new FormData();

    selectedFiles.forEach(file => {
        formData.append("planilhas", file, file.name);
    });

    const submitButton = document.querySelector(".upload-files-submit");
    isUploadingFiles = true;

    if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
    }

    try {
        const response = await fetch("/upload-planilhas", {
            method: "POST",
            body: formData,
        });
        const body = await response.json();

        if (!response.ok) {
            let message = "Ocorreu um erro ao enviar as planilhas.";

            if (Array.isArray(body.errors)) {
                message = body.errors.join("\n");
            } else if (typeof body.error === "string") {
                message = body.error;
            }

            throw new Error(message);
        }

        if (!isUploadAcceptedResponse(body)) {
            throw new Error("O servidor nao devolveu os dados do processamento.");
        }

        selectedFiles = [];
        showProcessingScreen(body.cnpjs);
        connectToUploadEvents(body.statusUrl);
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Ocorreu um erro ao enviar as planilhas.";

        showUploadValidationMessage(message);
        console.error("Erro no upload:", error);
        isUploadingFiles = false;

        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
            submitButton.textContent = "Enviar planilhas";
        }
    }
}


filesDiv.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return;

    const submitButton = event.target.closest(".upload-files-submit");

    if (submitButton) {
        await uploadSelectedFiles();
        return;
    }

    const removeButton = event.target.closest(".upload-file-remove");

    if (!removeButton) return;

    const index = Number(removeButton.dataset.index);
    removeFile(index);
});
