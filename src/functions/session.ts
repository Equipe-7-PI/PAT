import type { SessionUser } from "../types/session.types";
import { redirect } from "./redirect";

function parseCookies(cookieHeader: string | null): Record<string, string> {
    if (!cookieHeader) return {};

    return cookieHeader
        .split(";")
        .map(part => part.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, part) => {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex === -1) return acc;

            const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
            const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());

            acc[key] = value;
            return acc;
        }, {});
}

function getSessionFromRequest(req: Request): SessionUser | null {
    const cookies = parseCookies(req.headers.get("cookie"));
    const sessionToken = cookies["session"];

    if (sessionToken === "sessao-valida-exemplo") {
        return {
            userId: "1",
            username: "admin",
        };
    }

    return null;
}

export function requireAuth(req: Request) {
    const session = getSessionFromRequest(req);
    if (!session) return { ok: false, response: redirect("/login") };
    return { ok: true, session };
}