import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
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

    const { title, description, config, resources } = await req.json();
    if (!title || !config || !resources) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const presetId = crypto.randomUUID();
    const now = Date.now();
    
    const presetData = {
      presetId,
      title,
      description: description || "",
      config,
      resources,
      author: decoded.username,
      createdAt: now
    };

    // Save the preset
    await kv.hset(`preset:${presetId}`, presetData);
    
    // Add to global feed
    await kv.zadd('global:presets', { score: now, member: presetId });

    return new Response(JSON.stringify({ success: true, presetId }), { status: 201 });
  } catch (error) {
    console.error("Publish Preset Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function GET() {
  try {
    // Get top 50 presets by score descending
    const presetIds = await kv.zrange('global:presets', 0, 49, { rev: true });
    
    if (!presetIds || presetIds.length === 0) {
      return new Response(JSON.stringify({ presets: [] }), { status: 200 });
    }

    // Pipeline to fetch all
    const pipeline = kv.pipeline();
    presetIds.forEach(id => {
      pipeline.hgetall(`preset:${id}`);
    });
    const presets = await pipeline.exec();

    // Filter out nulls if any got deleted manually
    const validPresets = presets.filter(p => p !== null);

    return new Response(JSON.stringify({ presets: validPresets }), { status: 200 });
  } catch (error) {
    console.error("Fetch Presets Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
