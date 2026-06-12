import { env } from '../config/env.js';
import { jsonStore } from './jsonStore.js';
import { pgStore } from './pgStore.js';

export const store = env.databaseUrl ? pgStore : jsonStore;
