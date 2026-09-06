import { kv } from '@vercel/kv';

export async function POST(req) {
  try {
    const { config, resources, mockDb } = await req.json();

    if (!config || !resources || !mockDb) {
      return new Response(JSON.stringify({ error: "Missing required payload fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate unique project ID (e.g., 'lw8d4fxa7h2')
    const projectId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Save state to Vercel KV
    await kv.set(`project:${projectId}`, { config, resources, mockDb });

    // Format the base API URL (could use req.headers.get("host") if deploying this to Vercel)
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
