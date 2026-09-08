import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export async function DELETE(req, { params }) {
  try {
    const { projectId } = await params;
    
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET);
    if (!decoded || !decoded.username) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    // Verify ownership
    const isMember = await kv.sismember(`user:${decoded.username}:projects`, projectId);
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not own this project" }), { status: 403 });
    }

    // Delete project
    await kv.srem(`user:${decoded.username}:projects`, projectId);
    await kv.del(`project:${projectId}`);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Project Deletion Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
