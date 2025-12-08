// ============================================================================
// NEXUS ROUTER - Request Routing System
// ============================================================================

import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';

export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | '*';

export interface RouteHandler<T = unknown, R = unknown> {
  (request: RouteRequest<T>): R | Promise<R>;
}

export interface RouteRequest<T = unknown> {
  id: string;
  path: string;
  method: RouteMethod;
  params: Record<string, string>;
  query: Record<string, string>;
  body?: T;
  headers: Record<string, string>;
  timestamp: number;
}

export interface RouteResponse<R = unknown> {
  status: number;
  data?: R;
  error?: string;
  headers?: Record<string, string>;
}

export interface Route {
  path: string;
  method: RouteMethod;
  handler: RouteHandler;
  middleware: RouteMiddleware[];
}

export type RouteMiddleware = (
  request: RouteRequest,
  next: () => Promise<unknown>
) => Promise<unknown>;

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export class NexusRouter {
  private routes: Route[] = [];
  private globalMiddleware: RouteMiddleware[] = [];
  private notFoundHandler?: RouteHandler;

  // ----------------------------- Route Registration -------------------------
  register(
    method: RouteMethod,
    path: string,
    handler: RouteHandler,
    middleware: RouteMiddleware[] = []
  ): void {
    this.routes.push({ path, method, handler, middleware });
  }

  get(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('GET', path, handler, middleware);
  }

  post(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('POST', path, handler, middleware);
  }

  put(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('PUT', path, handler, middleware);
  }

  patch(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('PATCH', path, handler, middleware);
  }

  delete(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('DELETE', path, handler, middleware);
  }

  all(path: string, handler: RouteHandler, middleware?: RouteMiddleware[]): void {
    this.register('*', path, handler, middleware);
  }

  // ----------------------------- Middleware ---------------------------------
  use(middleware: RouteMiddleware): void {
    this.globalMiddleware.push(middleware);
  }

  setNotFoundHandler(handler: RouteHandler): void {
    this.notFoundHandler = handler;
  }

  // ----------------------------- Route Matching -----------------------------
  match(path: string, method: RouteMethod): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method) continue;

      const params = this.matchPath(route.path, path);
      if (params) {
        return { route, params };
      }
    }
    return null;
  }

  private matchPath(
    routePath: string,
    requestPath: string
  ): Record<string, string> | null {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    if (routeParts.length !== requestParts.length) {
      // Check for wildcard
      if (!routePath.includes('*')) return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart === '*') {
        // Wildcard matches rest
        params['*'] = requestParts.slice(i).join('/');
        return params;
      }

      if (routePart.startsWith(':')) {
        // Parameter
        const paramName = routePart.slice(1);
        params[paramName] = requestPart;
      } else if (routePart !== requestPart) {
        return null;
      }
    }

    return params;
  }

  // ----------------------------- Request Handling ---------------------------
  async handle<T, R>(
    method: RouteMethod,
    path: string,
    options: {
      body?: T;
      query?: Record<string, string>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<RouteResponse<R>> {
    const request: RouteRequest<T> = {
      id: generateUUID(),
      path,
      method,
      params: {},
      query: options.query || {},
      body: options.body,
      headers: options.headers || {},
      timestamp: now(),
    };

    eventBus.emit('router:request:start', { requestId: request.id, path, method });

    try {
      const match = this.match(path, method);

      if (!match) {
        if (this.notFoundHandler) {
          const result = await this.notFoundHandler(request);
          return { status: 404, data: result as R };
        }
        return { status: 404, error: 'Route not found' };
      }

      request.params = match.params;

      // Build middleware chain
      const middleware = [...this.globalMiddleware, ...match.route.middleware];
      
      const executeMiddleware = async (index: number): Promise<unknown> => {
        if (index < middleware.length) {
          return middleware[index](request, () => executeMiddleware(index + 1));
        }
        return match.route.handler(request);
      };

      const result = await executeMiddleware(0);

      eventBus.emit('router:request:complete', { requestId: request.id, path, method });

      return { status: 200, data: result as R };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      eventBus.emit('router:request:error', { requestId: request.id, path, method, error });
      
      return { status: 500, error: errorMessage };
    }
  }

  // ----------------------------- Statistics ---------------------------------
  getRoutes(): Array<{ method: RouteMethod; path: string }> {
    return this.routes.map(r => ({ method: r.method, path: r.path }));
  }

  getStats() {
    return {
      totalRoutes: this.routes.length,
      byMethod: {
        GET: this.routes.filter(r => r.method === 'GET').length,
        POST: this.routes.filter(r => r.method === 'POST').length,
        PUT: this.routes.filter(r => r.method === 'PUT').length,
        PATCH: this.routes.filter(r => r.method === 'PATCH').length,
        DELETE: this.routes.filter(r => r.method === 'DELETE').length,
      },
      globalMiddleware: this.globalMiddleware.length,
    };
  }
}

// Singleton instance
export const nexusRouter = new NexusRouter();
export default nexusRouter;

// ----------------------------- Built-in Middleware --------------------------
// Logging middleware
export const loggingMiddleware: RouteMiddleware = async (request, next) => {
  console.log(`[Router] ${request.method} ${request.path}`);
  const start = now();
  const result = await next();
  console.log(`[Router] ${request.method} ${request.path} - ${now() - start}ms`);
  return result;
};

// Validation middleware factory
export const validationMiddleware = (
  schema: Record<string, (value: unknown) => boolean>
): RouteMiddleware => {
  return async (request, next) => {
    if (request.body) {
      for (const [field, validate] of Object.entries(schema)) {
        const value = (request.body as Record<string, unknown>)[field];
        if (!validate(value)) {
          throw new Error(`Validation failed for field: ${field}`);
        }
      }
    }
    return next();
  };
};

// Auth middleware factory
export const authMiddleware = (
  validateToken: (token: string) => boolean | Promise<boolean>
): RouteMiddleware => {
  return async (request, next) => {
    const token = request.headers['authorization']?.replace('Bearer ', '');
    if (!token || !(await validateToken(token))) {
      throw new Error('Unauthorized');
    }
    return next();
  };
};


