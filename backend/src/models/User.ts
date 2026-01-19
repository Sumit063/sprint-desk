import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);
