import type { Routes } from "../types/routesGlobal.types";

export const loginRoute: Routes = {
    "/login": {
        GET() {
            return new Response("Página de login");
        },
        async POST(req: Request) {
            return new Response("Processando login...");
        }
    }
}