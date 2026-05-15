import { redirect } from "./functions/redirect";
import { requireAuth } from "./functions/session";
import { assetsRoutes } from "./routes/assets.routes";
import { homeRoute } from "./routes/home.route";
import { authRoute } from "./routes/auth.routes";

Bun.serve({
    hostname: "0.0.0.0",
    port: 3000, //? Roda na porta 3000 (Mas pode ser qualquer uma)
    routes: {
        //? Aqui ele "puxa" todas as rotas importadas
        ...assetsRoutes,
        ...authRoute,
        ...homeRoute
    },
    fetch(req: Request) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        //? Faz com que redirecione automaticamente para home se for "/" e o usuário estiver autenticado
        if (pathname === "/") { 
            const auth = requireAuth(req);
            if (auth.ok) return redirect("/home");
            return redirect("/login");
        }

        //? Se não bater em nenhuma rota em "routes: {}" ele cai no 404
        return new Response("Rota não encontrada", { status: 404 });
    },
});

console.log("Servidor ON!");
console.log("http://localhost:3000");
console.log("http://127.0.0.1:3000");