import fs from 'node:fs/promises';
import path from 'node:path';
import { store } from '../storage/index.js';

const logsDir = path.resolve('logs');
const logFile = path.join(logsDir, 'security-events.jsonl');

export async function logEvent({
  req,
  userId = null,
  username = 'anonymous',
  eventType,
  severity = 'info',
  status = 'success',
  description,
  metadata = {},
  security = false
}) {
  const timestamp = new Date().toISOString();
  const sourceIp = req?.actor?.sourceIp || req?.ip || metadata.sourceIp || 'unknown';
  const userAgent = req?.actor?.userAgent || req?.headers?.['user-agent'] || 'unknown';
  const payload = {
    timestamp,
    userId,
    username,
    sourceIp,
    userAgent,
    eventType,
    severity,
    status,
    description,
    metadata
  };

  await store.insert('auditLogs', payload);
  if (security || ['high', 'critical'].includes(severity)) {
    await store.insert('securityEvents', payload);
  }

  await fs.mkdir(logsDir, { recursive: true });
  await fs.appendFile(
    logFile,
    `${JSON.stringify({
      timestamp,
      event: eventType,
      username,
      user_id: userId,
      source_ip: sourceIp,
      user_agent: userAgent,
      severity,
      status,
      description,
      metadata
    })}\n`
  );

  return payload;
}
