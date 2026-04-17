import { loginRoute } from "./routes/login";

Bun.serve({
    port: 3000,
    routes: {
        ...loginRoute
    },
    fetch() {
        return new Response("Rota não encontrada", { status: 404 });
    },
});

console.log("Servidor ON!");
console.log("http://localhost:3000");