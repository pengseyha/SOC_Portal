import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logEvent } from '../services/loggingService.js';
import { store } from '../storage/index.js';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      await logEvent({
        req: request,
        eventType: 'unauthorized_access',
        severity: 'medium',
        status: 'blocked',
        description: `Missing JWT for ${request.method} ${request.originalUrl}`,
        security: true
      });
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { sub: string };
      const user = await store.findUserById(decoded.sub);
      if (!user || user.status !== 'active') throw new UnauthorizedException('Invalid or disabled account');
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      await logEvent({
        req: request,
        eventType: 'invalid_api_request',
        severity: 'medium',
        status: 'failed',
        description: `Invalid JWT for ${request.method} ${request.originalUrl}`,
        security: true
      });
      throw new UnauthorizedException('Invalid token');
    }
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role === 'admin') return true;
    await logEvent({
      req: request,
      userId: request.user?.id,
      username: request.user?.username,
      eventType: 'unauthorized_access',
      severity: 'high',
      status: 'blocked',
      description: 'Non-admin user attempted to access admin route',
      security: true
    });
    throw new ForbiddenException('Admin access required');
  }
}
