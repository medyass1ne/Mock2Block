export default function generateExpress(config, resources) {
  const { port = 5000, cors = true, delay = 0 } = config;

  let code = `const express = require('express');\n`;
  if (cors) {
    code += `const cors = require('cors');\n`;
  }
  code += `const crypto = require('crypto');\n\n`;
  code += `const app = express();\n`;
  code += `const PORT = ${port};\n\n`;

  code += `// Middleware\n`;
  code += `app.use(express.json());\n`;
  if (cors) {
    code += `app.use(cors());\n`;
  }
  
  if (delay > 0) {
    code += `\n// Delay Middleware\n`;
    code += `app.use((req, res, next) => {\n`;
    code += `  setTimeout(next, ${delay});\n`;
    code += `});\n`;
  }
  code += `\n// In-memory Data Stores\n`;
  resources.forEach(res => {
    let dummyObject = 'id: crypto.randomUUID(),\n    ';
    res.fields.forEach(f => {
      let val = '""';
      if (f.type === 'string') val = '"Sample String"';
      else if (f.type === 'number') val = '42';
      else if (f.type === 'boolean') val = 'true';
      dummyObject += `${f.name}: ${val},\n    `;
    });

    code += `const ${res.name} = [\n  {\n    ${dummyObject.trim()}\n  }\n];\n\n`;
  });

  code += `// CRUD Endpoints\n`;
  resources.forEach(res => {
    const rName = res.name;
    const rPath = `/api/${rName}`;
    
    // GET all
    code += `\n// GET ${rPath}\n`;
    code += `app.get('${rPath}', (req, res) => {\n`;
    code += `  res.json(${rName});\n`;
    code += `});\n`;

    // GET by id
    code += `\n// GET ${rPath}/:id\n`;
    code += `app.get('${rPath}/:id', (req, res) => {\n`;
    code += `  const item = ${rName}.find(i => i.id === req.params.id);\n`;
    code += `  if (!item) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  res.json(item);\n`;
    code += `});\n`;

    // POST
    code += `\n// POST ${rPath}\n`;
    code += `app.post('${rPath}', (req, res) => {\n`;
    code += `  const newItem = { id: crypto.randomUUID(), ...req.body };\n`;
    code += `  ${rName}.push(newItem);\n`;
    code += `  res.status(201).json(newItem);\n`;
    code += `});\n`;

    // PUT
    code += `\n// PUT ${rPath}/:id\n`;
    code += `app.put('${rPath}/:id', (req, res) => {\n`;
    code += `  const index = ${rName}.findIndex(i => i.id === req.params.id);\n`;
    code += `  if (index === -1) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  ${rName}[index] = { ...${rName}[index], ...req.body, id: ${rName}[index].id };\n`;
    code += `  res.json(${rName}[index]);\n`;
    code += `});\n`;

    // DELETE
    code += `\n// DELETE ${rPath}/:id\n`;
    code += `app.delete('${rPath}/:id', (req, res) => {\n`;
    code += `  const index = ${rName}.findIndex(i => i.id === req.params.id);\n`;
    code += `  if (index === -1) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  const deletedItem = ${rName}.splice(index, 1)[0];\n`;
    code += `  res.json(deletedItem);\n`;
    code += `});\n`;
  });

  code += `\n// Start Server\n`;
  code += `app.listen(PORT, () => {\n`;
  code += `  console.log(\`Server is running on http://localhost:\${PORT}\`);\n`;
  code += `});\n`;

  return code;
}
