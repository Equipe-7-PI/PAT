export function redirect(path: string): Response {
    return Response.redirect(path, 302)
}