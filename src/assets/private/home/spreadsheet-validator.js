//? Validador executado no navegador antes do upload.
//? Ele melhora o feedback para o usuario, mas nao substitui a validacao do servidor.
(function initializeSpreadsheetValidator(global) {
    "use strict";

    const DATA_START_ROW_INDEX = 8;
    const LAST_EXPECTED_COLUMN_INDEX = 9;
    const MAX_DATA_ROWS = 10000;

    const EXPECTED_HEADERS = new Map([
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

    function normalizeText(value) {
        return String(value).trim().replace(/\s+/g, " ");
    }

    function getCellValue(sheet, address) {
        return sheet[address]?.v ?? null;
    }

    function getCellText(sheet, address) {
        const value = getCellValue(sheet, address);

        if (typeof value === "string") {
            const normalizedValue = normalizeText(value);
            return normalizedValue || null;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
        }

        return null;
    }

    function readRow(sheet, rowIndex) {
        const row = [];

        for (let columnIndex = 0; columnIndex <= LAST_EXPECTED_COLUMN_INDEX; columnIndex++) {
            const address = global.XLSX.utils.encode_cell({
                r: rowIndex,
                c: columnIndex,
            });

            row.push(getCellValue(sheet, address));
        }

        return row;
    }

    function isEmptyRow(row) {
        return row.every(value => value === null);
    }

    function getDeclaredTotal(row) {
        for (const value of row) {
            if (typeof value !== "string") continue;

            const match = /^Total:\s*(\d+)$/i.exec(value.trim());
            if (match?.[1]) return Number(match[1]);
        }

        return null;
    }

    function valueToText(value) {
        if (typeof value === "string") {
            const normalizedValue = normalizeText(value);
            return normalizedValue || null;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
        }

        return null;
    }

    function isValidDate(value) {
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

    function validateDataRow(row, excelRowNumber) {
        const errors = [];
        const vacancyId = valueToText(row[0]);
        const occupationCode = valueToText(row[2]);
        const occupationDescription = valueToText(row[3]);
        const employerType = valueToText(row[4])?.toUpperCase();
        const employerDocument = valueToText(row[5])?.replace(/\D/g, "") ?? "";
        const status = valueToText(row[6]);
        const vacancyQuantity = valueToText(row[7]);
        const expirationDate = valueToText(row[9]);

        if (!vacancyId || !/^\d+$/.test(vacancyId)) {
            errors.push(`Linha ${excelRowNumber}: identificação da vaga inválida.`);
        }

        if (!occupationCode || !/^\d{6}$/.test(occupationCode)) {
            errors.push(`Linha ${excelRowNumber}: código de ocupação deve possuir 6 dígitos.`);
        }

        if (!occupationDescription || occupationDescription.length > 200) {
            errors.push(`Linha ${excelRowNumber}: descrição da ocupação inválida.`);
        }

        if (employerType !== "CPF" && employerType !== "CNPJ") {
            errors.push(`Linha ${excelRowNumber}: tipo do empregador deve ser CPF ou CNPJ.`);
        } else if (employerDocument.length !== (employerType === "CPF" ? 11 : 14)) {
            errors.push(`Linha ${excelRowNumber}: identificador não corresponde ao tipo ${employerType}.`);
        }

        if (!status || status.length > 120) {
            errors.push(`Linha ${excelRowNumber}: status da vaga inválido.`);
        }

        if (!vacancyQuantity || !/^\d+$/.test(vacancyQuantity) || Number(vacancyQuantity) <= 0) {
            errors.push(`Linha ${excelRowNumber}: quantidade de vagas deve ser um inteiro positivo.`);
        }

        if (!expirationDate || !isValidDate(expirationDate)) {
            errors.push(`Linha ${excelRowNumber}: data de vencimento deve usar DD/MM/AAAA.`);
        }

        if (row[1] !== null || row[8] !== null) {
            errors.push(`Linha ${excelRowNumber}: estrutura de colunas mescladas inválida.`);
        }

        return errors;
    }

    function validateWorkbook(workbook) {
        const errors = [];

        if (workbook.SheetNames.length !== 1) {
            return ["A planilha deve possuir exatamente uma aba."];
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : null;

        if (!sheet) return ["Não foi possível acessar a aba da planilha."];
        if (!sheet["!ref"]) return ["A planilha está vazia."];

        const usedRange = global.XLSX.utils.decode_range(sheet["!ref"]);

        if (usedRange.e.c < LAST_EXPECTED_COLUMN_INDEX) {
            errors.push("A planilha não possui todas as colunas esperadas até J.");
        }

        for (const [address, expectedValue] of EXPECTED_HEADERS) {
            if (getCellText(sheet, address) !== expectedValue) {
                errors.push(`Cabeçalho inválido em ${address}: esperado "${expectedValue}".`);
            }
        }

        if (getCellText(sheet, "B2") !== "Vagas Usando Critérios - IMO") {
            errors.push('Título inválido: esperado "Vagas Usando Critérios - IMO".');
        }

        if (!getCellText(sheet, "A5")?.startsWith("[ABRANGÊNCIA =")) {
            errors.push("A linha de critérios do relatório não foi reconhecida.");
        }

        const dataRows = [];
        let declaredTotal = null;

        for (let rowIndex = DATA_START_ROW_INDEX; rowIndex <= usedRange.e.r; rowIndex++) {
            const currentRow = readRow(sheet, rowIndex);

            if (isEmptyRow(currentRow) && rowIndex < usedRange.e.r) {
                const total = getDeclaredTotal(readRow(sheet, rowIndex + 1));

                if (total !== null) {
                    declaredTotal = total;
                    break;
                }
            }

            dataRows.push(currentRow);
        }

        if (declaredTotal === null) {
            errors.push('Rodapé inválido: esperado uma linha vazia seguida por "Total: N".');
        }

        if (dataRows.length === 0) {
            errors.push("A planilha não possui vagas para processar.");
        }

        if (dataRows.length > MAX_DATA_ROWS) {
            errors.push(`A planilha excede o limite de ${MAX_DATA_ROWS} vagas.`);
        }

        dataRows.forEach((row, index) => {
            errors.push(...validateDataRow(row, DATA_START_ROW_INDEX + index + 1));
        });

        if (declaredTotal !== null && declaredTotal !== dataRows.length) {
            errors.push(
                `O total declarado (${declaredTotal}) não corresponde às ${dataRows.length} linhas encontradas.`,
            );
        }

        return errors;
    }

    async function validateFile(file) {
        if (!global.XLSX) {
            return {
                ok: false,
                errors: ["O leitor de planilhas não foi carregado."],
            };
        }

        try {
            const buffer = await file.arrayBuffer();
            const workbook = global.XLSX.read(buffer, {
                type: "array",
                cellDates: false,
                cellFormula: false,
                cellHTML: false,
                cellNF: false,
                cellStyles: false,
            });
            const errors = validateWorkbook(workbook);

            return {
                ok: errors.length === 0,
                errors,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            return {
                ok: false,
                errors: [`Não foi possível ler a planilha (${message}).`],
            };
        }
    }

    global.PATSpreadsheetValidator = {
        validateFile,
    };
})(window);
