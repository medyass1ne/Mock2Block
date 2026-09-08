import { kv } from '@vercel/kv';
import jwt from 'jsonwebtoken';

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
}

export async function GET(req, { params }) {
  return handleRequest('GET', req, params);
}

export async function POST(req, { params }) {
  return handleRequest('POST', req, params);
}

export async function PUT(req, { params }) {
  return handleRequest('PUT', req, params);
}

export async function DELETE(req, { params }) {
  return handleRequest('DELETE', req, params);
}

async function handleRequest(method, req, params) {
  try {
    const { projectId, slug } = await params;
    
    const projectData = await kv.get(`project:${projectId}`);
    if (!projectData) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }

    const { config, resources, mockDb } = projectData;

    // Simulate latency
    if (config.delay && config.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    // Chaos Middleware
    if (config.chaosMode) {
      const chance = Math.random() * 100;
      if (chance < (config.chaosRate || 0)) {
        const errors = [500, 403, 502, 503];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        return new Response(JSON.stringify({ error: "Chaos injected server error" }), {
          status: randomError,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }
    }

    // Auth Login Interception
    const requestPath = slug.join('/');
    if (config.authEndpointEnabled && requestPath === 'auth/login' && method === 'POST') {
      let body;
      try { body = await req.json(); } catch (e) { body = {}; }
      
      const secret = process.env.JWT_SECRET || 'mock2block_secret_key';
      const token = jwt.sign({ email: body.email || 'mockuser@example.com' }, secret, { expiresIn: '1h' });
      
      return new Response(JSON.stringify({ token, message: 'Mock login successful' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }

    const resourceName = slug[0];
    const id = slug[1];

    if (!mockDb[resourceName]) {
      return new Response(JSON.stringify({ error: `Mock data for '${resourceName}' not initialized` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }

    const resourceConfig = resources.find(r => r.name === resourceName);

    // Auth Middleware for matched route
    if (resourceConfig && resourceConfig.requireAuth) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }
    }

    const collection = mockDb[resourceName];
    let responseBody = {};
    let status = 200;

    if (method === "GET") {
      if (id) {
        const item = collection.find(i => String(i.id) === String(id));
        if (item) responseBody = item;
        else {
          status = 404;
          responseBody = { error: `${resourceName} not found` };
        }
      } else {
        // Pagination & Filtering
        const url = new URL(req.url);
        const searchParams = Object.fromEntries(url.searchParams.entries());
        
        let filteredData = [...collection];
        
        // Query filtering
        Object.entries(searchParams).forEach(([key, value]) => {
          if (key !== 'page' && key !== 'limit') {
            filteredData = filteredData.filter(item => String(item[key]) === String(value));
          }
        });

        const page = parseInt(searchParams.page) || 1;
        const limit = parseInt(searchParams.limit) || filteredData.length;
        const paginatedData = filteredData.slice((page - 1) * limit, page * limit);
        
        responseBody = {
          data: paginatedData,
          total: filteredData.length,
          page,
          limit
        };
      }
    } 
    else if (method === "POST") {
      if (!id) {
        let body;
        try { body = await req.json(); } catch (e) { body = {}; }
        const newItem = { id: crypto.randomUUID(), ...body };
        collection.push(newItem);
        await kv.set(`project:${projectId}`, { config, resources, mockDb });
        status = 201;
        responseBody = newItem;
      } else {
        status = 400;
        responseBody = { error: "Cannot POST to a specific ID" };
      }
    }
    else if (method === "PUT") {
      if (id) {
        let body;
        try { body = await req.json(); } catch (e) { body = {}; }
        const index = collection.findIndex(i => String(i.id) === String(id));
        if (index !== -1) {
          const updatedItem = { ...collection[index], ...body, id: collection[index].id };
          collection[index] = updatedItem;
          await kv.set(`project:${projectId}`, { config, resources, mockDb });
          responseBody = updatedItem;
        } else {
          status = 404;
          responseBody = { error: `${resourceName} not found` };
        }
      } else {
        status = 400;
        responseBody = { error: "PUT requires an ID" };
      }
    }
    else if (method === "DELETE") {
      if (id) {
        const index = collection.findIndex(i => String(i.id) === String(id));
        if (index !== -1) {
          collection.splice(index, 1);
          await kv.set(`project:${projectId}`, { config, resources, mockDb });
          responseBody = { success: true };
        } else {
          status = 404;
          responseBody = { error: `${resourceName} not found` };
        }
      } else {
        status = 400;
        responseBody = { error: "DELETE requires an ID" };
      }
    }

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });

  } catch (error) {
    console.error("API Mock Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
}
