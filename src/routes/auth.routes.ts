import { redirect } from "../functions/redirect";
import { requireAuth } from "../functions/session";
import type { Routes } from "../types/routesGlobal.types";

export const authRoute: Routes = {
    "/login": {
        GET(req) {
            //? Verifica se o usuário já está logado
            //* Se o usuário já está logado, não faz sentido ele ir para a tela de login...
            const auth = requireAuth(req);
            //? Se estiver logado, vai direto pra /home
            if (auth.ok) return redirect("/home");

            //? Se não está logado, envia a página de login.
            return new Response(Bun.file("./src/templates/login.html"));
        },
        async POST(req) {
            //? Opa! Aqui ele vai capturar o form do HTML
            const form = await req.formData();

            //? Captura os valores inseridos como usuário e senha
            const username = String(form.get("username") ?? "");
            const password = String(form.get("password") ?? "");

            const credenciaisValidas = //TODO ISSO AQUI É SÓ PRA TESTE NÃO VAI FICAR PARA PRODUÇÃO
                username === "admin" && password === "1234567890";

            if (!credenciaisValidas) return new Response("Credenciais Inválidas!", { status: 401 });

            // const sessionId = crypto.randomUUID(); //TODO Posteriormente será gerado assim
            const sessionId = "sessao-valida-exemplo";

            //TODO Posteriormente vamos armazenar esse sessionId num banco ou no redis...
            //TODO De alguma forma precisamos armazenar o id da sessão

            //? Devolve para o usuário os cookies de autenticação <3
            return new Response(null, {
                status: 204,
                headers: {
                    "Location": "/home",
                    "Set-Cookie":
                        `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`
                }
            });
        }
    },
    "/logout": {
        POST() {
            //? Aqui não precisa validar sessão porque a pessoa vai "sair"
            //? Então mesmo se não estiver logado, vai "deslogar" mesmo assim kkkk (ou pelo menos dar a sensação)
            return new Response(null, {
                status: 302,
                headers: {
                    "Location": "/login",
                    "Set-Cookie": //? A lógica é simples, ele simplesmente sobrescreve o cookie de autenticação válido por "nada" (vazio)
                        'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
                }
            });
            //! QUANDO FOR IMPLEMENTADO A PARTE DE ARMAZENAR O ID DA SESSÃO
            //! PRECISA COLOCAR AQUI PARA INVALIDAR O ID DA SESSÃO QUANDO O LOGOUT FOR REALIZADO
        }
    }
};