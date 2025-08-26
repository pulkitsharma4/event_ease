// src/services/authService.ts
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import User, { IUser, UserRole } from "@/models/User";

/** Input expected from controller */
export type SignupInput = {
    name: string;
    email: string;
    password: string;
};

/** Minimal success / error shape for controllers */
export type SignupResult =
    | {
        success: true;
        user: {
            id: string;
            name: string;
            email: string;
            role: UserRole; // "owner" | "staff" | "admin"
            emailVerified: boolean;
            phoneVerified: boolean;
        };
    }
    | {
        success: false;
        error: "INVALID_INPUT" | "EMAIL_TAKEN" | "INTERNAL_ERROR";
    };

export type LoginInput = { email: string; password: string };
export type LoginResult =
    | {
        success: true;
        user: { id: string; name: string; email: string; role: "owner" | "staff" | "admin" };
    }
    | { success: false; error: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "INTERNAL_ERROR" };

// Allow configuring rounds via env; fall back to 10 (safe default)
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

export async function signup(input: SignupInput): Promise<SignupResult> {
    const name = (input.name ?? "").trim();
    const email = (input.email ?? "").trim().toLowerCase();
    const password = input.password ?? "";

    // Basic server-side validation (UI also validates, but never trust client)
    if (!name || !email || !password || password.length < 8) {
        return { success: false, error: "INVALID_INPUT" };
    }

    await dbConnect();

    // Check if email already in use
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
        return { success: false, error: "EMAIL_TAKEN" };
    }

    try {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const created = await User.create({
            name,
            email,
            passwordHash,
            role: "owner" as UserRole, // default role per spec
            emailVerified: false,
            phoneVerified: false,
        });

        return {
            success: true,
            user: {
                id: created._id.toString(),
                name: created.name,
                email: created.email,
                role: created.role,
                emailVerified: created.emailVerified,
                phoneVerified: created.phoneVerified,
            },
        };
    } catch {
        return { success: false, error: "INTERNAL_ERROR" };
    }
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  const password = input.password ?? "";
  if (!email || !password) return { success: false, error: "INVALID_INPUT" };
  await dbConnect();

  try {
    const u = await User.findOne({ email }).select("_id name email role passwordHash").lean();
    if (!u) return { success: false, error: "INVALID_CREDENTIALS" };
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return { success: false, error: "INVALID_CREDENTIALS" };

    return {
      success: true,
      user: { id: u._id.toString(), name: u.name, email: u.email, role: u.role },
    };
  } catch {
    return { success: false, error: "INTERNAL_ERROR" };
  }
}
