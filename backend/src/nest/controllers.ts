import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import bcrypt from 'bcryptjs';
import { stringify } from 'csv-stringify/sync';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logEvent } from '../services/loggingService.js';
import { store } from '../storage/index.js';
import { AdminGuard, AuthGuard } from './auth.guard.js';

function signToken(user, rememberMe = false) {
  const expiresIn = rememberMe ? env.jwtRememberExpiresIn : env.jwtExpiresIn;
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn']
  });
}

function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function today(value) {
  return value?.startsWith(new Date().toISOString().slice(0, 10));
}

const userSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  role: z.enum(['admin', 'analyst']).default('analyst'),
  title: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional()
});

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'soc-monitoring-portal' };
  }
}

@Controller('api/auth')
export class AuthController {
  @Post('register')
  async register(@Req() req, @Body() payload) {
    const body = z.object({
      name: z.string().min(2),
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(8)
    }).parse(payload);
    const existing = await store.findUserByIdentifier(body.email) || await store.findUserByIdentifier(body.username);
    if (existing) throw new BadRequestException('User already exists');
    const now = new Date().toISOString();
    const user = await store.insert('users', {
      ...body,
      id: uuid(),
      passwordHash: await bcrypt.hash(body.password, 12),
      role: 'analyst',
      status: 'active',
      title: 'Security Analyst',
      department: 'SOC',
      phone: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    });
    await logEvent({ req, userId: user.id, username: user.username, eventType: 'user_registration', severity: 'info', description: 'New user registered' });
    return { user: publicUser(user), token: signToken(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req, @Body() payload) {
    const body = z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
      rememberMe: z.boolean().optional()
    }).parse(payload);
    const user = await store.findUserByIdentifier(body.identifier);
    const username = user?.username || body.identifier;
    if (!user) {
      await logEvent({ req, username, eventType: 'login_failed', severity: 'high', status: 'failed', description: 'Login failed for unknown account', security: true });
      throw new BadRequestException('Invalid credentials');
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await logEvent({ req, userId: user.id, username, eventType: 'account_lockout', severity: 'critical', status: 'blocked', description: 'Locked account login attempt', security: true });
      throw new BadRequestException('Account locked. Try again later.');
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockedUntil = failedLoginAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await store.update('users', user.id, { failedLoginAttempts, lockedUntil });
      await logEvent({ req, userId: user.id, username, eventType: failedLoginAttempts >= 5 ? 'account_lockout' : 'login_failed', severity: failedLoginAttempts >= 5 ? 'critical' : 'high', status: 'failed', description: `${failedLoginAttempts} failed login attempt(s)`, metadata: { failedLoginAttempts }, security: true });
      throw new BadRequestException('Invalid credentials');
    }
    const updated = await store.update('users', user.id, { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() });
    await logEvent({ req, userId: user.id, username, eventType: 'login_success', severity: 'info', description: 'User logged in' });
    return { user: publicUser(updated), token: signToken(updated, body.rememberMe) };
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'logout', severity: 'info', description: 'User logged out' });
    return { message: 'Logged out' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Req() req, @Body() payload) {
    const { email } = z.object({ email: z.string().email() }).parse(payload);
    const user = await store.findUserByIdentifier(email);
    const resetToken = uuid();
    await logEvent({ req, userId: user?.id, username: user?.username || email, eventType: 'password_reset_requested', severity: 'medium', description: 'Password reset requested', metadata: { resetToken } });
    return { message: 'Reset link generated for demo use', resetToken };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Req() req, @Body() payload) {
    const { token } = z.object({ token: z.string().min(8), password: z.string().min(8) }).parse(payload);
    await logEvent({ req, eventType: 'password_reset', severity: 'medium', description: 'Password reset token submitted', metadata: { token } });
    return { message: 'Password reset accepted in demo mode' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req) {
    return { user: publicUser(req.user) };
  }
}

@Controller('api/contact')
export class ContactController {
  @Post()
  async create(@Req() req, @Body() payload) {
    const body = z.object({ name: z.string().min(2), email: z.string().email(), subject: z.string().min(3), message: z.string().min(10) }).parse(payload);
    const message = await store.insert('contactMessages', { ...body, sourceIp: req.actor.sourceIp, userAgent: req.actor.userAgent, createdAt: new Date().toISOString() });
    await logEvent({ req, username: body.email, eventType: 'contact_form_submission', severity: 'info', description: `Contact form submitted: ${body.subject}` });
    return { message };
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get()
  async all() {
    return { messages: await store.all('contactMessages') };
  }
}

@UseGuards(AuthGuard)
@Controller('api/profile')
export class ProfileController {
  @Get()
  get(@Req() req) {
    return { user: publicUser(req.user) };
  }

  @Put()
  async update(@Req() req, @Body() payload) {
    const body = z.object({ name: z.string().min(2), email: z.string().email(), title: z.string().optional(), department: z.string().optional(), phone: z.string().optional() }).parse(payload);
    const user = await store.update('users', req.user.id, body);
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'profile_update', severity: 'info', description: 'User updated profile' });
    return { user };
  }

  @Put('password')
  async password(@Req() req, @Body() payload) {
    const body = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }).parse(payload);
    const valid = await bcrypt.compare(body.currentPassword, req.user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    await store.update('users', req.user.id, { passwordHash: await bcrypt.hash(body.newPassword, 12) });
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'password_change', severity: 'medium', description: 'User changed password' });
    return { message: 'Password changed' };
  }

  @Get('login-history')
  async loginHistory(@Req() req) {
    const logs = (await store.queryLogs('auditLogs', { eventType: 'login_success' })).filter((log) => log.userId === req.user.id);
    return { logs };
  }

  @Get('activity')
  async activity(@Req() req) {
    const activities = (await store.all('auditLogs')).filter((log) => log.userId === req.user.id).slice(0, 100);
    return { activities };
  }
}

@UseGuards(AuthGuard, AdminGuard)
@Controller('api/admin')
export class AdminController {
  @Get('users')
  async users() {
    return { users: (await store.all('users')).map(publicUser) };
  }

  @Post('users')
  async createUser(@Req() req, @Body() payload) {
    const body = userSchema.extend({ password: z.string().min(8) }).parse(payload);
    const user = await store.insert('users', { ...body, passwordHash: await bcrypt.hash(body.password, 12), status: 'active', failedLoginAttempts: 0, lockedUntil: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'admin_create_user', severity: 'medium', description: `Admin created user ${body.username}`, security: true });
    return { user: publicUser(user) };
  }

  @Put('users/:id')
  async updateUser(@Req() req, @Param('id') id: string, @Body() payload) {
    const user = await store.update('users', id, userSchema.partial().parse(payload));
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'admin_edit_user', severity: 'medium', description: `Admin edited user ${id}`, security: true });
    return { user: publicUser(user) };
  }

  @Patch('users/:id/disable')
  async disable(@Req() req, @Param('id') id: string) {
    const user = await store.update('users', id, { status: 'disabled' });
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'admin_disable_user', severity: 'high', description: `Admin disabled user ${id}`, security: true });
    return { user: publicUser(user) };
  }

  @Delete('users/:id')
  async remove(@Req() req, @Param('id') id: string) {
    await store.remove('users', id);
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'admin_delete_user', severity: 'high', description: `Admin deleted user ${id}`, security: true });
    return { message: 'User deleted' };
  }

  @Post('users/:id/reset-password')
  async reset(@Req() req, @Param('id') id: string) {
    const password = `Reset${Math.random().toString(36).slice(2, 8)}!`;
    await store.update('users', id, { passwordHash: await bcrypt.hash(password, 12), failedLoginAttempts: 0, lockedUntil: null });
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'admin_reset_password', severity: 'high', description: `Admin reset password for ${id}`, security: true });
    return { password };
  }

  @Get('audit-logs')
  async audit(@Query() query) {
    return { logs: await store.queryLogs('auditLogs', query) };
  }

  @Get('security-events')
  async events(@Query() query) {
    return { events: await store.queryLogs('securityEvents', query) };
  }
}

@UseGuards(AuthGuard)
@Controller('api')
export class LogsController {
  @Get('audit-logs')
  async audit(@Query() query) {
    return { logs: await store.queryLogs('auditLogs', query) };
  }

  @Get('audit-logs/export.csv')
  async exportCsv(@Query() query, @Res() res) {
    const logs = await store.queryLogs('auditLogs', query);
    const csv = stringify(logs, { header: true, columns: ['timestamp', 'username', 'eventType', 'sourceIp', 'severity', 'status', 'description'] });
    res.header('Content-Type', 'text/csv');
    res.attachment('audit-logs.csv');
    res.send(csv);
  }

  @Get('security-events')
  async security(@Query() query) {
    return { events: await store.queryLogs('securityEvents', query) };
  }

  @Get('activity/timeline')
  async timeline() {
    const logs = await store.all('auditLogs');
    return { activities: logs.slice(0, 100) };
  }
}

@UseGuards(AuthGuard)
@Controller('api/dashboard')
export class DashboardController {
  @Get('overview')
  async overview() {
    const [users, auditLogs, securityEvents] = await Promise.all([store.all('users'), store.all('auditLogs'), store.all('securityEvents')]);
    const ipCounts = auditLogs.reduce((acc, log) => {
      if (['login_failed', 'invalid_api_request'].includes(log.eventType)) acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
      return acc;
    }, {});
    return {
      widgets: {
        totalUsers: users.length,
        totalEvents: auditLogs.length + securityEvents.length,
        failedLoginsToday: auditLogs.filter((log) => log.eventType === 'login_failed' && today(log.timestamp)).length,
        lockedAccounts: users.filter((user) => user.lockedUntil && new Date(user.lockedUntil) > new Date()).length,
        activeSessions: users.filter((user) => user.lastLoginAt && Date.now() - new Date(user.lastLoginAt).getTime() < 86400000).length
      },
      topAttackerIps: Object.entries(ipCounts).map(([ip, count]) => ({ ip, count })).sort((a, b) => Number(b.count) - Number(a.count)).slice(0, 5),
      recentAlerts: securityEvents.slice(0, 8),
      recentLogins: auditLogs.filter((log) => log.eventType === 'login_success').slice(0, 8),
      recentActions: auditLogs.slice(0, 10)
    };
  }
}

@UseGuards(AuthGuard)
@Controller('api/uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { dest: path.resolve('uploads'), limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@Req() req, @UploadedFile() file) {
    if (!file) throw new BadRequestException('File is required');
    const record = await store.insert('fileUploads', {
      userId: req.user.id,
      username: req.user.username,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      sourceIp: req.actor.sourceIp,
      createdAt: new Date().toISOString()
    });
    await logEvent({ req, userId: req.user.id, username: req.user.username, eventType: 'file_upload', severity: 'medium', description: `Uploaded ${file.originalname}`, metadata: { size: file.size, filename: file.originalname } });
    return { upload: record };
  }

  @Get()
  async all(@Req() req) {
    const uploads = (await store.all('fileUploads')).filter((item) => req.user.role === 'admin' || item.userId === req.user.id);
    return { uploads };
  }
}
