import type { RenderPrivatePageOptions } from "../types/renderPrivatePage.types";

//? O layout global e carregado uma vez quando o modulo e importado.
//? Isso evita reler o mesmo HTML estatico a cada request autenticada.
const globalTemplate = await Bun.file("./src/templates/global.html").text();

//? Escapa valores dinamicos que devem ser tratados como texto.
//? Exemplo: nome de usuario nao pode virar HTML caso venha com "<script>".
function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

//? Transforma caminhos CSS em tags <link>.
//? Os paths sao escapados porque entram dentro de atributo HTML.
function renderCssLinks(paths: string[] = []): string {
    return paths
        .map(path => `    <link rel="stylesheet" href="${escapeHtml(path)}" />`)
        .join("\n");
}

//? Transforma caminhos JS em tags <script>.
//? Os paths tambem sao escapados porque entram dentro de atributo HTML.
function renderJsScripts(paths: string[] = []): string {
    return paths
        .map(path => `    <script src="${escapeHtml(path)}"></script>`)
        .join("\n");
}

//? Renderiza uma pagina privada usando o shell global.
//?
//? O que e substituido:
//? - {% titulo_pagina %}: texto do <title>
//? - {% nome_usuario %}: texto exibido na sidebar
//? - {% css_dinamico %}: links CSS especificos da pagina
//? - {% conteudo_pagina %}: HTML interno do <main>
//? - {% js_dinamico %}: scripts especificos da pagina
//?
//? Importante: content entra como HTML de proposito, porque ele vem dos templates
//? internos do projeto. Dados de usuario devem ser escapados antes de virar content.
export function renderPrivatePage(options: RenderPrivatePageOptions): Response {
    const html = globalTemplate
        .replaceAll("{% titulo_pagina %}", escapeHtml(options.title))
        .replaceAll("{% nome_usuario %}", escapeHtml(options.username))
        .replaceAll("{% css_dinamico %}", renderCssLinks(options.cssPaths))
        .replaceAll("{% conteudo_pagina %}", options.content)
        .replaceAll("{% js_dinamico %}", renderJsScripts(options.jsPaths));

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
