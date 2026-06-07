export type RouteHandler = (
  req: Request,
  server: Bun.Server<unknown>,
) => Response | Promise<Response>;

export type RouteHandlers = {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  DELETE?: RouteHandler;
};

export type Routes = Record<string, RouteHandlers>;
