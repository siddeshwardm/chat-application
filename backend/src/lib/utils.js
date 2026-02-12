import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const isProduction = process.env.NODE_ENV === "production";

  const token = jwt.sign({ userId }, jwtSecret, {
    expiresIn,
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: isProduction ? "strict" : "lax", // allow localhost dev across ports
    secure: isProduction,
  });

  return token;
};
