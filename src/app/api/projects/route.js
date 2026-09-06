import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const decoded = jwt.verify(token.value, JWT_SECRET);
    if (!decoded || !decoded.username) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    const projectIds = await kv.smembers(`user:${decoded.username}:projects`);

    if (!projectIds || projectIds.length === 0) {
      return new Response(JSON.stringify({ projects: [], username: decoded.username }), { status: 200 });
    }

    const projectsData = await Promise.all(
      projectIds.map(async (id) => {
        const data = await kv.get(`project:${id}`);
        return { projectId: id, ...data };
      })
    );

    const validProjects = projectsData.filter(p => p && p.config && p.resources);
    
    // Sort by createdAt descending
    validProjects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return new Response(JSON.stringify({ projects: validProjects, username: decoded.username }), { status: 200 });
  } catch (error) {
    console.error("Projects Fetch Error:", error);
    return new Response(JSON.stringify({ error: "Unauthorized or server error" }), { status: 401 });
  }
}
