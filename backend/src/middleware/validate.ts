import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: result.error.flatten().fieldErrors
      });
    }

    req.body = result.data;
    return next();
  };
}
