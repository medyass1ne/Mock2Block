import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { config, resources, mockDb } = await req.json();

    if (!config || !resources || !mockDb) {
      return new Response(JSON.stringify({ error: "Missing required payload fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate unique project ID
    const projectId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Save state to Vercel KV
    await kv.set(`project:${projectId}`, { config, resources, mockDb, createdAt: Date.now() });

    // Link to user if authenticated
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token');
      if (token) {
        const decoded = jwt.verify(token.value, JWT_SECRET);
        if (decoded && decoded.username) {
          await kv.sadd(`user:${decoded.username}:projects`, projectId);
        }
      }
    } catch (e) {
      // Ignore token verification errors during deploy, just means it's an anonymous deploy
      console.error("Auth linking skipped:", e.message);
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}/projects/${projectId}/test/api`;

    return new Response(JSON.stringify({ projectId, baseUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Deploy Error:", error);
    return new Response(JSON.stringify({ error: "Failed to deploy to cloud" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
