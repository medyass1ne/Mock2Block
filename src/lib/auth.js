import jwt from "jsonwebtoken";

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'mock2block_secret_key');
  } catch (error) {
    return null;
  }
};

export const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'mock2block_secret_key', { expiresIn: '7d' });
};
