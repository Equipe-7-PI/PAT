export type RenderPrivatePageOptions = {
    //? Texto que entra no <title>. Deve ser tratado como texto comum, nunca como HTML.
    title: string;

    //? Nome exibido no rodape da sidebar. Tambem entra como texto comum.
    username: string;

    //? HTML principal da pagina. Hoje vem de templates internos do projeto, por isso nao e escapado.
    content: string;

    //? CSS especifico da pagina renderizada dentro do layout global.
    cssPaths?: string[];

    //? JavaScript especifico da pagina renderizada dentro do layout global.
    jsPaths?: string[];
};
