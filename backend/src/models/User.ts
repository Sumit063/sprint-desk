import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    provider: {
      type: String,
      enum: ["local", "google", "otp"],
      default: "local"
    },
    googleId: { type: String, unique: true, sparse: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);
