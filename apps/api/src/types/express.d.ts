import type { UserContext } from '../common/security';

declare module 'express' {
  interface Request {
    requestId?: string;
    user?: UserContext;
    rawBody?: Buffer;
  }
}
