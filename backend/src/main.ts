import 'reflect-metadata';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './nest/app.module.js';
import { env } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { store } from './storage/index.js';

const app = await NestFactory.create(AppModule);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const devLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
    if (!origin || env.frontendOrigins.includes(origin) || (env.nodeEnv !== 'production' && devLocalhost)) {
      return callback(null, true);
    }
    callback(new Error('CORS origin denied'));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(requestContext);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250 }));

await store.init?.();
await app.listen(env.port);

console.log(`SOC Monitoring Portal API listening on http://localhost:${env.port}`);
console.log(`Allowed frontend origins: ${env.frontendOrigins.join(', ')}`);
