import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../../lib/mailer';

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export async function GET(req) {
  try {
    const authUser = await authenticate();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await kv.get(`user:${authUser.username}`);
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    return new Response(JSON.stringify({
      username: user.username,
      email: user.email,
      isVerified: user.isVerified
    }), { status: 200 });
  } catch (error) {
    console.error("Settings GET Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const authUser = await authenticate();
    if (!authUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const user = await kv.get(`user:${authUser.username}`);
    if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    const body = await req.json();
    const { action } = body;

    if (action === 'update_username') {
      const { newUsername } = body;
      if (!newUsername || newUsername.trim() === '') {
        return new Response(JSON.stringify({ error: "Username cannot be empty" }), { status: 400 });
      }
      if (newUsername === user.username) {
        return new Response(JSON.stringify({ error: "New username must be different" }), { status: 400 });
      }

      const existingUser = await kv.get(`user:${newUsername}`);
      if (existingUser) {
        return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409 });
      }

      // Update records
      const updatedUser = { ...user, username: newUsername };
      await kv.set(`user:${newUsername}`, updatedUser);
      await kv.del(`user:${user.username}`);
      if (user.email) {
        await kv.set(`email:${user.email}`, newUsername);
      }

      // Re-issue JWT
      const token = jwt.sign({ userId: user.userId, username: newUsername }, JWT_SECRET, { expiresIn: '7d' });
      const cookieStore = await cookies();
      cookieStore.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });

      return new Response(JSON.stringify({ success: true, username: newUsername }), { status: 200 });
    }

    if (action === 'update_email') {
      const { newEmail } = body;
      if (!newEmail || !newEmail.includes('@')) {
        return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400 });
      }
      if (newEmail === user.email) {
        return new Response(JSON.stringify({ error: "New email must be different" }), { status: 400 });
      }

      const existingEmail = await kv.get(`email:${newEmail}`);
      if (existingEmail) {
        return new Response(JSON.stringify({ error: "Email already registered" }), { status: 409 });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const updatedUser = { ...user, email: newEmail, isVerified: false, verificationToken };
      
      await kv.set(`user:${user.username}`, updatedUser);
      await kv.set(`email:${newEmail}`, user.username);
      if (user.email) {
        await kv.del(`email:${user.email}`);
      }

      try {
        await sendVerificationEmail(newEmail, verificationToken);
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }

      return new Response(JSON.stringify({ success: true, message: "Email updated. Verification email sent." }), { status: 200 });
    }

    if (action === 'update_password') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return new Response(JSON.stringify({ error: "Current and new passwords required" }), { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Incorrect current password" }), { status: 401 });
      }

      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
      
      const updatedUser = { ...user, passwordHash: newPasswordHash };
      await kv.set(`user:${user.username}`, updatedUser);

      return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (error) {
    console.error("Settings PATCH Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
