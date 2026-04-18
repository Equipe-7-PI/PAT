export type RouteHandlers = {
    GET?: (req: Request) => Response | Promise<Response>;
    POST?: (req: Request) => Response | Promise<Response>;
    PUT?: (req: Request) => Response | Promise<Response>;
    DELETE?: (req: Request) => Response | Promise<Response>;
};

export type Routes = Record<string, RouteHandlers>;