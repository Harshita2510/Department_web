import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { ROLES } from '../src/constants/roles.js';
import { User } from '../src/models/user.model.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_INITIAL_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD before running this command.');
  process.exit(1);
}

await connectDatabase();
const existing = await User.findOne({ email:env.ADMIN_EMAIL });
if (existing) {
  console.log(`Administrator ${env.ADMIN_EMAIL} already exists; nothing changed.`);
} else {
  const passwordHash = await bcrypt.hash(env.ADMIN_INITIAL_PASSWORD, env.BCRYPT_ROUNDS);
  await User.create({ email:env.ADMIN_EMAIL, passwordHash, role:ROLES.ADMIN, mustChangePassword:true });
  console.log(`Administrator ${env.ADMIN_EMAIL} created. Change the initial password immediately.`);
}
await disconnectDatabase();
