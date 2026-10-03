import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import 'dotenv/config';
import { AUTH_COOKIE } from './auth-cookie.js';

const jwtSecret = process.env.JWT_SECRET;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured. Add it to your .env file.');
    }

    super({
      // The httpOnly cookie is the primary carrier; the Bearer header stays
      // as a fallback for non-browser clients (Postman, server-to-server).
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[AUTH_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.userId,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}