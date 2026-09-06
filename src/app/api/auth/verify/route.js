import { kv } from '@vercel/kv';
import { redirect } from 'next/navigation';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return new Response(JSON.stringify({ error: "Missing token or email" }), { status: 400 });
    }

    // Find user by email
    const username = await kv.get(`email:${email}`);
    if (!username) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const user = await kv.get(`user:${username}`);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    if (user.isVerified) {
      redirect('/?verified=already');
    }

    if (user.verificationToken !== token) {
      return new Response(JSON.stringify({ error: "Invalid or expired verification token" }), { status: 400 });
    }

    // Mark as verified and remove the token
    const updatedUser = {
      ...user,
      isVerified: true,
    };
    delete updatedUser.verificationToken;

    await kv.set(`user:${username}`, updatedUser);

    redirect('/?verified=success');
  } catch (error) {
    // redirect() throws a special error — rethrow it
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Verify Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
