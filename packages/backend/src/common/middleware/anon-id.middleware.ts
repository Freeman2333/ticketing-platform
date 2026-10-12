import { randomUUID } from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';

export const ANON_ID_COOKIE_NAME = 'anon_id';
const ANON_ID_COOKIE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

const ANON_ID_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

declare module 'express' {
  interface Request {
    anonId: string;
  }
}

export function anonIdMiddleware(req: Request, res: Response, next: NextFunction) {
  let anonId = req.cookies?.[ANON_ID_COOKIE_NAME];

  if (!anonId) {
    anonId = randomUUID();
    res.cookie(ANON_ID_COOKIE_NAME, anonId, {
      ...ANON_ID_COOKIE_OPTIONS,
      maxAge: ANON_ID_COOKIE_TTL_MS,
    });
  }

  req.anonId = anonId;
  next();
}
