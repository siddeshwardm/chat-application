import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const isProduction = process.env.NODE_ENV === "production";

  const configuredSameSite = (process.env.COOKIE_SAMESITE || "").toLowerCase();
  const sameSite = configuredSameSite || (isProduction ? "strict" : "lax");

  const configuredSecure = process.env.COOKIE_SECURE;
  const secure =
    typeof configuredSecure === "string"
      ? configuredSecure.toLowerCase() === "true"
      : isProduction;

  const token = jwt.sign({ userId }, jwtSecret, {
    expiresIn,
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    // For cross-site cookies (frontend + backend on different domains), set:
    // COOKIE_SAMESITE=none and COOKIE_SECURE=true
    sameSite,
    secure: sameSite === "none" ? true : secure,
  });

  return token;
};
