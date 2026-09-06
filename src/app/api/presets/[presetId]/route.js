import { kv } from '@vercel/kv';

export async function GET(req, { params }) {
  try {
    const { presetId } = await params;
    if (!presetId) {
      return new Response(JSON.stringify({ error: "Preset ID required" }), { status: 400 });
    }

    const preset = await kv.hgetall(`preset:${presetId}`);
    
    if (!preset) {
      return new Response(JSON.stringify({ error: "Preset not found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ preset }), { status: 200 });
  } catch (error) {
    console.error("Fetch Preset Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
