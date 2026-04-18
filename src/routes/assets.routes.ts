import { requireAuth } from "../functions/session";
import type { Routes } from "../types/routesGlobal.types";

function getFileByReq(req: Request): string {
    const url = new URL(req.url); //? Converte a string URL em new URL, facilitando a manipulação
    const pathname = url.pathname; //? Captura o pathname -> https://localhost/login (url) -> /login (pathname)

    const prefixPub = "/assets/public/"; //? Prefixo das rotas públicas (acessível sem autenticação)
    const prefixPriv = "/assets/private/"; //? Prefixo das rotas privadas (acessíveis somente com autenticação)

    //? Valida o arquivo (fiz com prefixPub e depois com prefixPriv para poder tornar isso uma função genérica)
    const file =
        (pathname.startsWith(prefixPub) ? pathname.slice(prefixPub.length) : null) ??
        (pathname.startsWith(prefixPriv) ? pathname.slice(prefixPriv.length) : "")

    //? Se o caminho do arquivo não estiver especificado, retorna vazio
    //* Serve para isso:
    //* if (!file) return new Response("Arquivo não informado", { status: 400 });
    if (!file) return ''

    //? Se não estiver vazio ele retorna o caminho do arquivo a partir do /public ou /private
    return file;
}

export const assetsRoutes: Routes = {
    "/assets/public/*": {
        GET(req) {
            //? Captura o nome do arquivo
            const file = getFileByReq(req);

            //? Valida se o arquivo realmente foi especificado
            if (!file) return new Response("Arquivo não informado", { status: 400 });

            //? Retorna o arquivo a partir do caminho
            return new Response(Bun.file(`./src/assets/public/${file}`));
        }
    },
    "/assets/private/*": {
        GET(req) {
            //? Antes de mais nada, por ser /private, ele valida a sessão do usuário
            const auth = requireAuth(req);
            if (!auth.ok) return new Response("Não autorizado!", { status: 401 });

            //? Mesmo esquema de capturar o nome do arquivo
            const file = getFileByReq(req);
            //? Valida se o caminho do arquivo foi especificado
            if (!file) return new Response("Arquivo não informado", { status: 400 });

            //? Retorna o arquivo a partir do caminho
            return new Response(Bun.file(`./src/assets/private/${file}`));
        }
    }
};