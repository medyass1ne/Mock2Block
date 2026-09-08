export default async function dispatchMockRequest(method, path, body, headers, mockDb, config, resources) {
  // Simulate network delay
  if (config.delay && config.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delay));
  }

  const start = performance.now();
  
  // Clone DB to return updated state safely without mutating directly
  const newDb = JSON.parse(JSON.stringify(mockDb));

  let response = { status: 404, data: { error: "Not Found" } };

  const urlObj = new URL(path, 'http://localhost');
  const pathname = urlObj.pathname;

  // Auth Login Interception
  if (config.authEndpointEnabled && pathname === '/api/auth/login' && method === 'POST') {
    return {
      status: 200,
      data: { token: "mock-jwt-token", message: "Mock login successful" },
      timeMs: Math.round(performance.now() - start + (config.delay || 0)),
      newDb
    };
  }

  // Helper to parse path: "/api/todos?page=1" -> match path without query string
  const match = pathname.match(/^\/api\/([^\/]+)(?:\/([^\/]+))?$/);
  
  if (match) {
    const resourceName = match[1];
    const id = match[2];
    
    // Auth Check Middleware
    const resourceConfig = resources?.find(r => r.name === resourceName);
    if (resourceConfig && resourceConfig.requireAuth) {
      const authHeader = headers?.Authorization || headers?.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          status: 401,
          data: { error: "Unauthorized" },
          timeMs: Math.round(performance.now() - start + (config.delay || 0)),
          newDb
        };
      }
    }

    // Chaos Middleware
    if (config.chaosMode) {
      const chance = Math.random() * 100;
      if (chance < (config.chaosRate || 0)) {
        const errors = [500, 403, 502, 503];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        return {
          status: randomError,
          data: { error: "Chaos injected server error" },
          timeMs: Math.round(performance.now() - start + (config.delay || 0)),
          newDb
        };
      }
    }

    if (newDb[resourceName]) {
      const collection = newDb[resourceName];

      try {
        if (method === "GET") {
          if (id) {
            const item = collection.find(i => i.id === id);
            if (item) response = { status: 200, data: item };
            else response = { status: 404, data: { error: `${resourceName} not found` } };
          } else {
            // Pagination & Filtering
            const searchParams = Object.fromEntries(urlObj.searchParams.entries());
            let filteredData = [...collection];
            
            Object.entries(searchParams).forEach(([key, value]) => {
              if (key !== 'page' && key !== 'limit') {
                filteredData = filteredData.filter(item => item[key] == value);
              }
            });

            const page = parseInt(searchParams.page) || 1;
            const limit = parseInt(searchParams.limit) || filteredData.length;
            const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

            response = { 
              status: 200, 
              data: {
                data: paginatedData,
                total: filteredData.length,
                page,
                limit
              } 
            };
          }
        } 
        else if (method === "POST") {
          if (!id) {
            const newItem = { id: crypto.randomUUID(), ...body };
            collection.push(newItem);
            response = { status: 201, data: newItem };
          } else {
            response = { status: 400, data: { error: "Cannot POST to a specific ID" } };
          }
        } 
        else if (method === "PUT") {
          if (id) {
            const index = collection.findIndex(i => i.id === id);
            if (index !== -1) {
              const updatedItem = { ...collection[index], ...body, id: collection[index].id };
              collection[index] = updatedItem;
              response = { status: 200, data: updatedItem };
            } else {
              response = { status: 404, data: { error: `${resourceName} not found` } };
            }
          } else {
            response = { status: 400, data: { error: "PUT requires an ID" } };
          }
        } 
        else if (method === "DELETE") {
          if (id) {
            const index = collection.findIndex(i => i.id === id);
            if (index !== -1) {
              collection.splice(index, 1);
              response = { status: 200, data: { success: true } };
            } else {
              response = { status: 404, data: { error: `${resourceName} not found` } };
            }
          } else {
            response = { status: 400, data: { error: "DELETE requires an ID" } };
          }
        }
      } catch (err) {
        response = { status: 500, data: { error: "Internal Server Error" } };
      }
    }
  }

  const end = performance.now();
  return { 
    status: response.status, 
    data: response.data, 
    timeMs: Math.round(end - start + (config.delay || 0)), 
    newDb 
  };
}
