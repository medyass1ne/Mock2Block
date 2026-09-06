export function downloadBlob(content, filename, contentType = 'application/json') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getDummyValue(type) {
  if (type === 'string') return "Sample String";
  if (type === 'number') return 42;
  if (type === 'boolean') return true;
  return "";
}

function generateDummyBody(fields) {
  const body = {};
  fields.forEach(f => {
    body[f.name] = getDummyValue(f.type);
  });
  return body;
}

export function exportToPostman(config, resources) {
  const baseUrl = `http://localhost:${config.port || 5000}`;
  
  const collection = {
    info: {
      name: "Mock2Block API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: resources.map(res => {
      const rPath = `/api/${res.name}`;
      const fullUrl = `${baseUrl}${rPath}`;
      const dummyBody = generateDummyBody(res.fields);
      
      return {
        name: res.name,
        item: [
          {
            name: `Get all ${res.name}`,
            request: { method: 'GET', url: { raw: fullUrl, host: [baseUrl], path: ["api", res.name] } }
          },
          {
            name: `Get ${res.name} by ID`,
            request: { method: 'GET', url: { raw: `${fullUrl}/:id`, host: [baseUrl], path: ["api", res.name, ":id"], variable: [{ key: "id", value: "1" }] } }
          },
          {
            name: `Create ${res.name}`,
            request: {
              method: 'POST',
              url: { raw: fullUrl, host: [baseUrl], path: ["api", res.name] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: { mode: 'raw', raw: JSON.stringify(dummyBody, null, 2) }
            }
          },
          {
            name: `Update ${res.name}`,
            request: {
              method: 'PUT',
              url: { raw: `${fullUrl}/:id`, host: [baseUrl], path: ["api", res.name, ":id"], variable: [{ key: "id", value: "1" }] },
              header: [{ key: "Content-Type", value: "application/json" }],
              body: { mode: 'raw', raw: JSON.stringify(dummyBody, null, 2) }
            }
          },
          {
            name: `Delete ${res.name}`,
            request: { method: 'DELETE', url: { raw: `${fullUrl}/:id`, host: [baseUrl], path: ["api", res.name, ":id"], variable: [{ key: "id", value: "1" }] } }
          }
        ]
      };
    })
  };
  
  downloadBlob(JSON.stringify(collection, null, 2), 'mock2block-postman.json');
}

export function exportToOpenAPI(config, resources) {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Mock2Block Generated API",
      version: "1.0.0"
    },
    servers: [{ url: `http://localhost:${config.port || 5000}` }],
    paths: {},
    components: { schemas: {} }
  };

  resources.forEach(res => {
    const rPath = `/api/${res.name}`;
    const rPathId = `/api/${res.name}/{id}`;
    
    // Build Schema
    const properties = { id: { type: "string" } };
    res.fields.forEach(f => {
      properties[f.name] = { type: f.type === 'number' ? 'number' : f.type === 'boolean' ? 'boolean' : 'string' };
    });
    
    spec.components.schemas[res.name] = {
      type: "object",
      properties
    };

    spec.paths[rPath] = {
      get: {
        summary: `Get all ${res.name}`,
        responses: {
          '200': {
            description: "Successful response",
            content: { "application/json": { schema: { type: "array", items: { $ref: `#/components/schemas/${res.name}` } } } }
          }
        }
      },
      post: {
        summary: `Create ${res.name}`,
        requestBody: {
          content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } }
        },
        responses: {
          '201': { description: "Created", content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } } }
        }
      }
    };

    spec.paths[rPathId] = {
      get: {
        summary: `Get ${res.name} by ID`,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          '200': { description: "Successful response", content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } } },
          '404': { description: "Not found" }
        }
      },
      put: {
        summary: `Update ${res.name}`,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } }
        },
        responses: {
          '200': { description: "Updated successfully", content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } } },
          '404': { description: "Not found" }
        }
      },
      delete: {
        summary: `Delete ${res.name}`,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          '200': { description: "Deleted successfully", content: { "application/json": { schema: { $ref: `#/components/schemas/${res.name}` } } } },
          '404': { description: "Not found" }
        }
      }
    };
  });

  downloadBlob(JSON.stringify(spec, null, 2), 'mock2block-openapi.json');
}
