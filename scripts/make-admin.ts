import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ---- Adjust if your User model path differs
import User from '../src/models/User';

// ------------ EDIT THESE VALUES -------------
const ADMIN_NAME = 'EventEase Admin';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PHONE = '+911234567890';
const ADMIN_PASSWORD = 'abc@123456';
const ADMIN_CONFIRM_PASSWORD = 'abc@123456';
// Optionally control bcrypt rounds via env (default 12)
const HASH_ROUNDS = Number(process.env.HASH_ROUNDS ?? 12);
// -------------------------------------------

// Load .env first, then override with .env.local if present
const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');
dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

type Role = 'owner' | 'staff' | 'admin';

async function connectDB() {
  const uri =
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;

  if (!uri) {
    console.error('❌ DATABASE_URL (or MONGODB_URI/MONGO_URL) is missing in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      autoIndex: false,
    });
  } catch (err: any) {
    console.error('❌ Failed to connect to MongoDB:', err?.message || err);
    process.exit(1);
  }
}

function validateInputs() {
  if (!ADMIN_NAME || ADMIN_NAME.trim().length < 2) {
    console.error('❌ ADMIN_NAME is required.');
    process.exit(1);
  }
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌ Invalid ADMIN_EMAIL:', ADMIN_EMAIL);
    process.exit(1);
  }
  if (typeof ADMIN_PHONE !== 'string' || ADMIN_PHONE.trim().length < 8) {
    console.error('❌ Invalid ADMIN_PHONE:', ADMIN_PHONE);
    process.exit(1);
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  if (ADMIN_PASSWORD !== ADMIN_CONFIRM_PASSWORD) {
    console.error('❌ Password and Confirm Password do not match.');
    process.exit(1);
  }
}

async function createAdmin() {
  const email = ADMIN_EMAIL.trim().toLowerCase();

  // 1) If user already exists: only upgrade role (do not touch password)
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    if ((existing as any).role !== 'admin') {
      const updated = await User.findOneAndUpdate(
        { email },
        { $set: { role: 'admin' as Role } },
        { new: true }
      );
      console.log('✅ Existing user found. Role updated to admin:', {
        id: updated?._id?.toString?.(),
        email: updated?.email,
        role: updated?.role,
      });
      return;
    }
    console.log('ℹ️  Admin user already exists:', {
      id: (existing as any)?._id?.toString?.(),
      email,
    });
    return;
  }

  // 2) Create brand new admin user with hashed password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, HASH_ROUNDS);

  const doc: any = {
    name: ADMIN_NAME.trim(),
    email,
    phone: ADMIN_PHONE.trim(),
    role: 'admin' as Role,
    passwordHash, // <-- your schema requires this
  };

  try {
    const created = await new (User as any)(doc).save();
    console.log('✅ Admin user created:', {
      id: created?._id?.toString?.(),
      email: created?.email,
      role: created?.role,
      phone: created?.phone,
      name: created?.name,
    });
  } catch (err: any) {
    console.error('❌ Failed to create admin:', err?.message || err);
    process.exit(1);
  }
}

(async function main() {
  validateInputs();
  await connectDB();
  try {
    await createAdmin();
  } catch (err: any) {
    console.error('❌ Operation failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => void 0);
  }
})();