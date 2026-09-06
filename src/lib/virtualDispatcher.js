export default async function dispatchMockRequest(method, path, body, mockDb, config) {
  // Simulate network delay
  if (config.delay && config.delay > 0) {
    await new Promise(resolve => setTimeout(resolve, config.delay));
  }

  const start = performance.now();
  
  // Clone DB to return updated state safely without mutating directly
  const newDb = JSON.parse(JSON.stringify(mockDb));

  let response = { status: 404, data: { error: "Not Found" } };

  // Helper to parse path: "/api/todos" -> { resource: "todos", id: undefined }
  // "/api/todos/123" -> { resource: "todos", id: "123" }
  const match = path.match(/^\/api\/([^\/]+)(?:\/([^\/]+))?$/);
  
  if (match) {
    const resourceName = match[1];
    const id = match[2];
    
    if (newDb[resourceName]) {
      const collection = newDb[resourceName];

      try {
        if (method === "GET") {
          if (id) {
            const item = collection.find(i => i.id === id);
            if (item) response = { status: 200, data: item };
            else response = { status: 404, data: { error: `${resourceName} not found` } };
          } else {
            response = { status: 200, data: collection };
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
