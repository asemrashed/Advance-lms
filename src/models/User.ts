import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

const SocialLinksSchema = new Schema(
  {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false },
);

const BankDetailsSchema = new Schema(
  {
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    routingNumber: { type: String, trim: true },
  },
  { _id: false },
);

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  /** @deprecated Legacy field — use `name` instead. */
  firstName?: string;
  /** @deprecated Legacy field — use `name` instead. */
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
  role: "super_admin" | "admin" | "instructor" | "student";
  /** pending = awaiting admin approval (instructors); active = can log in; blocked = denied/suspended */
  accountStatus: "pending" | "active" | "blocked";
  isActive: boolean;
  /** When true, student cannot create new course reviews */
  isBlockedFromReviews?: boolean;
  avatar?: string;
  bio?: string;
  address?: string;
  parentPhone?: string;
  education?: string;
  passOutInstitute?: string;
  specialization?: string;
  experience?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  /** Instructor payout bank account (required after approval for profile completion). */
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  /** Bumped to invalidate JWTs when force-logging out other devices. */
  sessionVersion?: number;
  /** Granular work limits for `role: "admin"`. Super admins ignore this. */
  adminPermissions?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "instructor", "student"],
      default: "student",
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlockedFromReviews: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    education: {
      type: String,
      trim: true,
    },
    passOutInstitute: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
    },
    socialLinks: {
      type: SocialLinksSchema,
      default: undefined,
    },
    bankDetails: {
      type: BankDetailsSchema,
      default: undefined,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    sessionVersion: {
      type: Number,
      default: 0,
    },
    adminPermissions: {
      type: [String],
      default: undefined,
    },
  },
  { timestamps: true },
);

UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ accountStatus: 1 });

UserSchema.methods.toJSON = function toJSON() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

const User = defineModel("User", UserSchema);

export default User;
