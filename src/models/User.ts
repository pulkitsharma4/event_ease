import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "owner" | "staff" | "admin";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;           // default: "owner"
  isBlocked: boolean;      // default: false
  emailVerified: boolean;   // default: false
  phoneVerified: boolean;   // default: false
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["owner", "staff", "admin"],
      default: "owner",
      index: true,
      required: true,
    },
    isBlocked: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false, index: true },
    phoneVerified: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Never expose passwordHash; normalize id
userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret: any) => {
    if (ret && ret._id) {
      ret.id = ret._id.toString?.();
      delete ret._id;
    }
    delete ret.passwordHash;
    return ret;
  },
});

const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
