import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { config, resources, mockDb, projectId: existingId } = await req.json();

    if (!config || !resources || !mockDb) {
      return new Response(JSON.stringify({ error: "Missing required payload fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let projectId = existingId;
    let isOwner = false;
    let tokenDecoded = null;

    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token');
      if (token) {
        tokenDecoded = jwt.verify(token.value, JWT_SECRET);
      }
    } catch (e) {
      console.error("Token verification skipped or failed:", e.message);
    }

    if (projectId) {
      if (!tokenDecoded || !tokenDecoded.username) {
        return new Response(JSON.stringify({ error: "Unauthorized to update this project" }), { status: 401 });
      }
      const isMember = await kv.sismember(`user:${tokenDecoded.username}:projects`, projectId);
      if (!isMember) {
        return new Response(JSON.stringify({ error: "Forbidden: You do not own this project" }), { status: 403 });
      }
      isOwner = true;
    } else {
      projectId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Save state to Vercel KV
    await kv.set(`project:${projectId}`, { config, resources, mockDb, createdAt: Date.now() });

    // Link to user if authenticated and this is a new project
    if (tokenDecoded && tokenDecoded.username && !isOwner) {
      await kv.sadd(`user:${tokenDecoded.username}:projects`, projectId);
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
