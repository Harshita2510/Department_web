import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize:env.MONGODB_MAX_POOL_SIZE,
    minPoolSize:env.MONGODB_MIN_POOL_SIZE,
    serverSelectionTimeoutMS:env.MONGODB_SERVER_SELECTION_TIMEOUT_MS
  });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
