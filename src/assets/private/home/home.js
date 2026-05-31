//? =============== Logica de upar planilha ===============
//? A ideia aqui e simples:
//? 1. O usuario escolhe/arrasta arquivos.
//? 2. O navegador guarda esses arquivos dentro da variavel selectedFiles.
//? 3. O JS redesenha a area de upload em formato de tabela.
//? 4. Nada vai para o servidor ainda. Isso so vai acontecer quando existir o botao de processar/finalizar.

const fileInput = document.querySelector("#file-upload"); //* <-- Input real que abre o seletor de arquivos
const dropZone = document.querySelector(".upload-dropzone"); //* <-- Area onde o usuario pode arrastar e soltar arquivos
const filesDiv = document.querySelector("#upload-files"); //* <-- Area visual onde a tabela de arquivos aparece

const MAX_FILES = 10; //* <-- Limite maximo de planilhas por envio. Mais que isso ja vira bagunca.
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; //* <-- 50 MB no total, contando todas as planilhas juntas.
const ALLOWED_FILE_EXTENSIONS = ["xls", "xlsx", "csv"]; //* <-- Extensoes aceitas. Se nao for planilha, nem entra na festa.

let selectedFiles = []; //* <-- Aqui ficam armazenadas as planilhas enquanto a pagina estiver aberta
let dragDepth = 0; //* <-- Conta quantas camadas internas da dropzone o mouse atravessou durante o drag

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

//? Funcao para adicionar arquivos dentro de selectedFiles
function addFiles(fileList) {
    //? fileList vem do input.files ou do event.dataTransfer.files.
    //? Ele parece uma array, mas nao e uma array de verdade, entao convertemos com Array.from.
    const files = Array.from(fileList);
    let totalSize = getSelectedFilesTotalSize();
    let blockedByType = false;
    let blockedByQuantity = false;
    let blockedBySize = false;
    let blockedByDuplicate = false;

    for (const file of files) {
        //? Regra 0: so aceita extensoes de planilha.
        //? Se o usuario arrastar um PDF, imagem, ZIP, receita de bolo, etc., a gente barra aqui.
        if (!isAllowedSpreadsheetFile(file)) {
            blockedByType = true;
            continue;
        }

        //? Regra 1: nao passa de 10 arquivos no total.
        //? Aqui conta o que ja estava selecionado + o que esta tentando entrar agora.
        if (selectedFiles.length >= MAX_FILES) {
            blockedByQuantity = true;
            continue;
        }

        //? Regra 2: nao passa de 50 MB somando todos os arquivos.
        //? O limite e do lote inteiro, nao de cada planilha individualmente.
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
            blockedBySize = true;
            continue;
        }

        //? Evita adicionar o mesmo arquivo duas vezes em sequencia.
        //? Isso nao e uma seguranca absoluta de "arquivo igual", mas ja segura bem o uso comum.
        const alreadyExists = selectedFiles.some(existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        );

        if (!alreadyExists) {
            selectedFiles.push(file);
            totalSize += file.size;
        } else {
            blockedByDuplicate = true;
        }
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
fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    renderSelectedFiles(); //? Atualiza o campo

    //? Limpa o input para permitir selecionar o mesmo arquivo novamente depois.
    //? Sem isso, o navegador pode pensar "ue, mas esse arquivo ja estava selecionado" e nao disparar change.
    fileInput.value = "";

    console.log(selectedFiles); //? Exibe no console do navegador os arquivos selecionados
});

//? Evento de clique dentro da area de arquivos.
//? Como a tabela e criada por innerHTML, os botoes de lixeira nao existem quando a pagina carrega.
//? Por isso usamos delegacao de evento: ouvimos o clique no pai e descobrimos se veio de uma lixeira.
filesDiv.addEventListener("click", (event) => {
    //? Garante que o alvo do clique e um elemento HTML antes de procurar a lixeira.
    //? Na pratica quase sempre vai ser, mas esse "quase" e onde mora a dor de cabeca gratuita.
    if (!(event.target instanceof Element)) return;

    const removeButton = event.target.closest(".upload-file-remove");

    if (!removeButton) return;

    const index = Number(removeButton.dataset.index);
    removeFile(index);
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
dropZone.addEventListener("drop", (event) => {
    if (!isDraggingFiles(event)) return;

    event.preventDefault(); //* <-- Isso evita o comportamento padrao do navegador, que pode abrir o arquivo na pagina
    hideDragState();

    //? Como a tabela fica dentro da dropzone, soltar arquivos em cima dela tambem cai aqui.
    //? Ou seja: area vazia, tabela, cabecalho, linha... tudo vira zona de drop. Democracia do upload.
    addFiles(event.dataTransfer.files); //? Chama a funcao que adiciona os arquivos a lista
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
