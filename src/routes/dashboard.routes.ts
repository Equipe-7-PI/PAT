import { redirect } from "../functions/redirect";
import { requireAuth } from "../functions/session";
import type { Routes } from "../types/routesGlobal.types";

export const dashboardRoute: Routes = {
    "/dashboard": {
        GET(req) {
            //? Só pode ir para o dashboard se estiver logado
            const auth = requireAuth(req);
            if (!auth.ok) return redirect("/login");

            //? Se chegou aqui, significa que está logado, portanto, envia a página dashboard
            return new Response(Bun.file("./src/templates/dashboard.html"));
        }
    }
}