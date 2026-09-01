import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { getInitialSeedData } from '../src/server/seedData.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export async function main() {
  console.log('🌱 Seeding database...');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Generate bcrypt hashes
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const userPasswordHash = await bcrypt.hash('User@123', 10);

  const seedData = await getInitialSeedData();

  // Explicitly guarantee the requested ADMIN user with email admin@tirthyatratrails.com and password Admin@123
  const adminUser = {
    id: 'usr-admin-1',
    name: 'Enterprise Yatra Admin',
    email: 'admin@tirthyatratrails.com',
    password: adminPasswordHash,
    role: 'ADMIN' as const,
    createdAt: new Date().toISOString(),
  };

  const existingAdminIndex = seedData.users.findIndex(
    (u) => u.email.toLowerCase() === 'admin@tirthyatratrails.com'
  );

  if (existingAdminIndex >= 0) {
    seedData.users[existingAdminIndex] = adminUser;
  } else {
    seedData.users.unshift(adminUser);
  }

  // Write to disk
  fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2), 'utf-8');

  console.log('✅ Seed successful!');
  console.log(`👤 Admin User created:`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Password: [Hashed with bcrypt: Admin@123]`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`📁 Database path: ${DB_FILE}`);
}

main().catch((e) => {
  console.error('❌ Error during seed:', e);
  process.exit(1);
});
