import { z } from 'zod';
import { 
  insertDomainSchema, 
  insertLandingPageSchema, 
  insertIpBlacklistSchema, 
  insertUABlacklistSchema,
  domains,
  landingPages,
  ipBlacklist,
  userAgentBlacklist,
  accessLogs,
  users
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
        method: 'GET' as const,
        path: '/api/auth/me',
        responses: {
            200: z.custom<typeof users.$inferSelect>(),
            401: errorSchemas.unauthorized,
        }
    }
  },
  cloaker: {
    check: {
      method: 'GET' as const,
      path: '/r/:slug', // Random slug for cloaking (less obvious path)
      input: z.object({
        // Headers and IP will be extracted from request in backend
      }).optional(),
      responses: {
        200: z.object({
          action: z.enum(['target', 'landing']),
          url: z.string().optional(), // For target
          html: z.string().optional(), // For landing
          logId: z.number(),
        }),
      },
    },
  },
  stats: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/stats/dashboard',
      responses: {
        200: z.object({
          totalVisits: z.number(),
          botVisits: z.number(),
          realVisits: z.number(),
          recentLogs: z.array(z.custom<typeof accessLogs.$inferSelect>()),
        }),
      },
    },
  },
  domains: {
    list: {
      method: 'GET' as const,
      path: '/api/domains',
      responses: {
        200: z.array(z.custom<typeof domains.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/domains/:id',
      responses: {
        200: z.custom<typeof domains.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/domains',
      input: insertDomainSchema,
      responses: {
        201: z.custom<typeof domains.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/domains/:id',
      input: insertDomainSchema.partial(),
      responses: {
        200: z.custom<typeof domains.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/domains/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  landingPages: {
    list: {
      method: 'GET' as const,
      path: '/api/landing-pages',
      responses: {
        200: z.array(z.custom<typeof landingPages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/landing-pages',
      input: insertLandingPageSchema,
      responses: {
        201: z.custom<typeof landingPages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/landing-pages/:id',
      input: insertLandingPageSchema.partial(),
      responses: {
        200: z.custom<typeof landingPages.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/landing-pages/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.custom<typeof accessLogs.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CreateDomainRequest = typeof api.domains.create.input._type;
export type UpdateDomainRequest = typeof api.domains.update.input._type;
export type CreateLandingPageRequest = typeof api.landingPages.create.input._type;
export type LoginRequest = typeof api.auth.login.input._type;
export type User = typeof api.auth.login.responses[200]["_type"];
