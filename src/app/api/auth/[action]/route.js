import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req, { params }) {
  try {
    const { action } = await params;
    
    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.delete('token');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username and password required" }), { status: 400 });
    }

    if (action === 'register') {
      const existingUser = await kv.get(`user:${username}`);
      if (existingUser) {
        return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409 });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = crypto.randomUUID();

      const userObj = { userId, username, passwordHash };
      await kv.set(`user:${username}`, userObj);
      
      const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
      const cookieStore = await cookies();
      cookieStore.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });

      return new Response(JSON.stringify({ success: true, username }), { status: 201 });
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
