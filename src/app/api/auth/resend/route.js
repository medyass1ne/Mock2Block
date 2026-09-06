import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../../lib/mailer';

export async function POST(req) {
  try {
    const { username } = await req.json();
    if (!username) {
      return new Response(JSON.stringify({ error: "Username required" }), { status: 400 });
    }

    const user = await kv.get(`user:${username}`);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    if (user.isVerified) {
      return new Response(JSON.stringify({ error: "Account is already verified" }), { status: 400 });
    }

    // Generate a fresh token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await kv.set(`user:${username}`, { ...user, verificationToken });

    await sendVerificationEmail(user.email, verificationToken);

    return new Response(JSON.stringify({ success: true, message: "Verification email resent. Check your inbox." }), { status: 200 });
  } catch (error) {
    console.error("Resend Error:", error);
    return new Response(JSON.stringify({ error: "Failed to resend verification email" }), { status: 500 });
  }
}
