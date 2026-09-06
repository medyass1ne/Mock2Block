export default function generateMarkdownDocs(config, resources) {
  const generateMockObject = (fields) => {
    const obj = {};
    fields.forEach(field => {
      if (field.type === 'string') obj[field.name] = "string";
      else if (field.type === 'number') obj[field.name] = 0;
      else if (field.type === 'boolean') obj[field.name] = true;
    });
    return obj;
  };

  let md = `# API Documentation\n\n`;
  md += `Auto-generated documentation for your Mock2Block server running on \`http://localhost:${config.port}\`.\n\n`;
  
  if (resources.length === 0) {
    md += `*No resources defined.*\n`;
    return md;
  }

  resources.forEach(res => {
    md += `## ${res.name.charAt(0).toUpperCase() + res.name.slice(1)}\n\n`;
    const mockObj = generateMockObject(res.fields);
    const mockResponse = { id: "uuid-v4-string", ...mockObj };

    const endpoints = [
      { method: 'GET', path: `/api/${res.name}`, desc: `Retrieve all ${res.name}`, hasBody: false, response: [mockResponse] },
      { method: 'GET', path: `/api/${res.name}/:id`, desc: `Retrieve a specific ${res.name.slice(0, -1)} by ID`, hasBody: false, response: mockResponse },
      { method: 'POST', path: `/api/${res.name}`, desc: `Create a new ${res.name.slice(0, -1)}`, hasBody: true, reqBody: mockObj, response: mockResponse },
      { method: 'PUT', path: `/api/${res.name}/:id`, desc: `Update an existing ${res.name.slice(0, -1)} by ID`, hasBody: true, reqBody: mockObj, response: mockResponse },
      { method: 'DELETE', path: `/api/${res.name}/:id`, desc: `Delete a ${res.name.slice(0, -1)} by ID`, hasBody: false, response: mockResponse },
    ];

    endpoints.forEach(ep => {
      md += `### ${ep.method} \`${ep.path}\`\n`;
      md += `${ep.desc}\n\n`;
      
      if (ep.hasBody) {
        md += `**Request Body**:\n\`\`\`json\n${JSON.stringify(ep.reqBody, null, 2)}\n\`\`\`\n\n`;
      }
      
      md += `**Response (200 OK)**:\n\`\`\`json\n${JSON.stringify(ep.response, null, 2)}\n\`\`\`\n\n`;
    });
    
    md += `---\n\n`;
  });

  return md;
}
