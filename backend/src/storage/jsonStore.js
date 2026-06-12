import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const dataDir = path.resolve('data');
const dbPath = path.join(dataDir, 'soc-db.json');

const initialState = {
  users: [],
  auditLogs: [],
  securityEvents: [],
  contactMessages: [],
  fileUploads: [],
  sessions: []
};

async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const now = new Date().toISOString();
    initialState.users.push({
      id: uuid(),
      username: 'admin',
      email: 'admin@soc.local',
      name: 'SOC Administrator',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'active',
      title: 'SOC Manager',
      department: 'Security Operations',
      phone: '',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    });
    await fs.writeFile(dbPath, JSON.stringify(initialState, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  return JSON.parse(await fs.readFile(dbPath, 'utf8'));
}

async function writeDb(db) {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

function matchesSearch(row, search = '') {
  const text = JSON.stringify(row).toLowerCase();
  return text.includes(search.toLowerCase());
}

export const jsonStore = {
  async all(collection) {
    const db = await readDb();
    return db[collection] || [];
  },

  async insert(collection, row) {
    const db = await readDb();
    const record = { id: uuid(), ...row };
    db[collection].unshift(record);
    await writeDb(db);
    return record;
  },

  async update(collection, id, patch) {
    const db = await readDb();
    const index = db[collection].findIndex((item) => item.id === id);
    if (index === -1) return null;
    db[collection][index] = { ...db[collection][index], ...patch, updatedAt: new Date().toISOString() };
    await writeDb(db);
    return db[collection][index];
  },

  async remove(collection, id) {
    const db = await readDb();
    const before = db[collection].length;
    db[collection] = db[collection].filter((item) => item.id !== id);
    await writeDb(db);
    return before !== db[collection].length;
  },

  async findUserByIdentifier(identifier) {
    const users = await this.all('users');
    return users.find((user) => user.email === identifier || user.username === identifier) || null;
  },

  async findUserById(id) {
    const users = await this.all('users');
    return users.find((user) => user.id === id) || null;
  },

  async queryLogs(collection, filters = {}) {
    let rows = await this.all(collection);
    if (filters.search) rows = rows.filter((row) => matchesSearch(row, filters.search));
    if (filters.severity) rows = rows.filter((row) => row.severity === filters.severity);
    if (filters.status) rows = rows.filter((row) => row.status === filters.status);
    if (filters.eventType) rows = rows.filter((row) => row.eventType === filters.eventType);
    return rows.slice(0, Number(filters.limit || 250));
  }
};
