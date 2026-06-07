export type SessionUser = {
    userId: string;
    username: string;
};

export type AuthResult =
    | {
        //? Quando ok = true, a rota pode acessar os dados da sessao com seguranca.
        ok: true;
        session: SessionUser;
    }
    | {
        //? Quando ok = false, a rota deve redirecionar ou devolver uma resposta de nao autorizado.
        ok: false;
        response: Response;
    };
