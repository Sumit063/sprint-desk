import { Schema, model, type InferSchemaType } from "mongoose";

const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true }
  },
  { timestamps: false }
);

export type Otp = InferSchemaType<typeof otpSchema>;

export const OtpModel = model("Otp", otpSchema);
