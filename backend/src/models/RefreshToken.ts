import { Schema, model, type InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;

export const RefreshTokenModel = model("RefreshToken", refreshTokenSchema);
