export const jwtSecret = process.env.JWT_SECRET ?? "dev_secret";
export const accessTokenTtlMinutes = Number(
  process.env.ACCESS_TOKEN_TTL_MIN ?? 15
);
export const refreshTokenTtlDays = Number(
  process.env.REFRESH_TOKEN_TTL_DAYS ?? 7
);
export const refreshCookieName = "refresh_token";
export const isProd = process.env.NODE_ENV === "production";
export const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  maxAge: refreshTokenTtlDays * 24 * 60 * 60 * 1000
};
