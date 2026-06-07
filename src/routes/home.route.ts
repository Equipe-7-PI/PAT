import { redirect } from "../functions/redirect";
import { renderPrivatePage } from "../functions/renderPrivatePage";
import { requireAuth } from "../functions/session";
import type { Routes } from "../types/routesGlobal.types";

//? Neste primeiro passo, home.html ainda e um documento HTML completo.
//? Para conseguir usar o global.html como shell sem apagar o template antigo,
//? extraimos somente o conteudo que ja estava dentro do <main class="main">.
//?
//? Quando a migracao estiver consolidada, o ideal e transformar home.html em um
//? partial de conteudo, ou criar um home.content.html, e remover esta extracao.
const homeTemplate = await Bun.file("./src/templates/home.html").text();
const homeContent =
  homeTemplate.match(/<main class="main">([\s\S]*?)<\/main>/)?.[1]?.trim() ??
  "";

export const homeRoute: Routes = {
  "/home": {
    GET(req) {
      //? Só pode ir pra home se estiver logado
      const auth = requireAuth(req);
      if (!auth.ok) return redirect("/login");

      //? Se chegou aqui, significa que esta logado, portanto, envia o layout global com o conteudo da home
      return renderPrivatePage({
        title: "Home - PAT",
        username: auth.session.username,
        content: homeContent,
        cssPaths: ["/assets/private/home/home.css"],
        jsPaths: [
          "/assets/private/vendor/xlsx.full.min.js",
          "/assets/private/home/spreadsheet-validator.js",
          "/assets/private/home/home.js",
        ],
      });
    },
  },
};
