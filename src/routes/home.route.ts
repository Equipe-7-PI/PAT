import { redirect } from "../functions/redirect";
import { requireAuth } from "../functions/session";
import type { Routes } from "../types/routesGlobal.types";

export const homeRoute: Routes = {
    "/home": {
        GET(req) {
            //? Só pode ir pra home se estiver logado
            const auth = requireAuth(req);
            if (!auth.ok) return redirect("/login");

            //? Se chegou aqui, significa que está logado, portanto, envia a página home
            return new Response(Bun.file("./src/templates/home.html"));
        }
    }
};