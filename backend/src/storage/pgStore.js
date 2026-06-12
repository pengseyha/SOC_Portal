import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env.js';

const pool = new Pool({ connectionString: env.databaseUrl });

const tables = {
  users: 'users',
  auditLogs: 'audit_logs',
  securityEvents: 'security_events',
  contactMessages: 'contact_messages',
  fileUploads: 'file_uploads'
};

const columns = {
  users: {
    id: 'id',
    username: 'username',
    email: 'email',
    name: 'name',
    passwordHash: 'password_hash',
    role: 'role',
    status: 'status',
    title: 'title',
    department: 'department',
    phone: 'phone',
    failedLoginAttempts: 'failed_login_attempts',
    lockedUntil: 'locked_until',
    lastLoginAt: 'last_login_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  auditLogs: {
    id: 'id',
    timestamp: 'timestamp',
    userId: 'user_id',
    username: 'username',
    sourceIp: 'source_ip',
    userAgent: 'user_agent',
    eventType: 'event_type',
    severity: 'severity',
    status: 'status',
    description: 'description',
    metadata: 'metadata'
  },
  securityEvents: {
    id: 'id',
    timestamp: 'timestamp',
    userId: 'user_id',
    username: 'username',
    sourceIp: 'source_ip',
    userAgent: 'user_agent',
    eventType: 'event_type',
    severity: 'severity',
    status: 'status',
    description: 'description',
    metadata: 'metadata'
  },
  contactMessages: {
    id: 'id',
    name: 'name',
    email: 'email',
    subject: 'subject',
    message: 'message',
    sourceIp: 'source_ip',
    userAgent: 'user_agent',
    createdAt: 'created_at'
  },
  fileUploads: {
    id: 'id',
    userId: 'user_id',
    username: 'username',
    filename: 'filename',
    originalName: 'original_name',
    mimeType: 'mime_type',
    size: 'size',
    sourceIp: 'source_ip',
    createdAt: 'created_at'
  }
};

function fromDb(row) {
  if (!row) return null;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      value instanceof Date ? value.toISOString() : value
    ])
  );
}

function insertStatement(collection, row) {
  const map = columns[collection];
  const normalized = { id: uuid(), ...row };
  const entries = Object.entries(normalized).filter(([key]) => map[key]);
  const fields = entries.map(([key]) => map[key]);
  const values = entries.map(([, value]) => value);
  const params = values.map((_, index) => `$${index + 1}`);
  return {
    text: `INSERT INTO ${tables[collection]} (${fields.join(', ')}) VALUES (${params.join(', ')}) RETURNING *`,
    values
  };
}

export const pgStore = {
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'analyst',
        status TEXT NOT NULL DEFAULT 'active',
        title TEXT DEFAULT '',
        department TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        user_id UUID,
        username TEXT,
        source_ip TEXT,
        user_agent TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        user_id UUID,
        username TEXT,
        source_ip TEXT,
        user_agent TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS contact_messages (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        source_ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS file_uploads (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        username TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER NOT NULL,
        source_ip TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
    `);

    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@soc.local']);
    if (rows.length === 0) {
      await this.insert('users', {
        username: 'admin',
        email: 'admin@soc.local',
        name: 'SOC Administrator',
        passwordHash: await bcrypt.hash('Admin123!', 12),
        role: 'admin',
        status: 'active',
        title: 'SOC Manager',
        department: 'Security Operations',
        phone: '',
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  },

  async all(collection) {
    const order = ['auditLogs', 'securityEvents'].includes(collection) ? 'timestamp' : 'created_at';
    const { rows } = await pool.query(`SELECT * FROM ${tables[collection]} ORDER BY ${order} DESC NULLS LAST LIMIT 500`);
    return rows.map(fromDb);
  },

  async insert(collection, row) {
    const statement = insertStatement(collection, row);
    const { rows } = await pool.query(statement.text, statement.values);
    return fromDb(rows[0]);
  },

  async update(collection, id, patch) {
    const map = columns[collection];
    const entries = Object.entries({ ...patch, updatedAt: new Date().toISOString() }).filter(([key]) => map[key]);
    const assignments = entries.map(([key], index) => `${map[key]} = $${index + 2}`);
    const values = entries.map(([, value]) => value);
    const { rows } = await pool.query(`UPDATE ${tables[collection]} SET ${assignments.join(', ')} WHERE id = $1 RETURNING *`, [id, ...values]);
    return fromDb(rows[0]);
  },

  async remove(collection, id) {
    const { rowCount } = await pool.query(`DELETE FROM ${tables[collection]} WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async findUserByIdentifier(identifier) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1', [identifier]);
    return fromDb(rows[0]);
  },

  async findUserById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return fromDb(rows[0]);
  },

  async queryLogs(collection, filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(`(username ILIKE $${values.length} OR event_type ILIKE $${values.length} OR source_ip ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }
    if (filters.severity) {
      values.push(filters.severity);
      clauses.push(`severity = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.eventType) {
      values.push(filters.eventType);
      clauses.push(`event_type = $${values.length}`);
    }
    const limit = Math.min(Number(filters.limit || 250), 1000);
    values.push(limit);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM ${tables[collection]} ${where} ORDER BY timestamp DESC LIMIT $${values.length}`, values);
    return rows.map(fromDb);
  }
};
