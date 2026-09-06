import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../../lib/mailer';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req, { params }) {
  try {
    const { action } = await params;
    
    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.delete('token');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const body = await req.json();
    const { username, password, email } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username and password required" }), { status: 400 });
    }

    if (action === 'register') {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
      }

      const existingUser = await kv.get(`user:${username}`);
      if (existingUser) {
        return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409 });
      }

      // Check if email is already used
      const existingEmail = await kv.get(`email:${email}`);
      if (existingEmail) {
        return new Response(JSON.stringify({ error: "Email already registered" }), { status: 409 });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = crypto.randomUUID();
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const userObj = { userId, username, email, passwordHash, isVerified: false, verificationToken };
      await kv.set(`user:${username}`, userObj);
      // Store email -> username mapping for verification lookup
      await kv.set(`email:${email}`, username);

      // Send verification email
      try {
        await sendVerificationEmail(email, verificationToken);
      } catch (mailError) {
        console.error("Failed to send verification email:", mailError);
        // Still return success — user was created, they can request a resend later
      }

      return new Response(JSON.stringify({ 
        success: true, 
        needsVerification: true,
        message: "Account created! Please check your email to verify your account before logging in." 
      }), { status: 201 });
    }

    if (action === 'login') {
      const user = await kv.get(`user:${username}`);
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
      }

      // Enforce email verification
      if (user.isVerified === false) {
        return new Response(JSON.stringify({ 
          error: "Please verify your email before logging in. Check your inbox for a verification link.",
          needsVerification: true 
        }), { status: 403 });
      }

      const token = jwt.sign({ userId: user.userId, username }, JWT_SECRET, { expiresIn: '7d' });
      const cookieStore = await cookies();
      cookieStore.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });

      return new Response(JSON.stringify({ success: true, username }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (error) {
    console.error("Auth Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
