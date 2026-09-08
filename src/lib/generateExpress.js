import { seedResource } from './smartFaker';

export default async function generateExpress(config, resources, mockDb = null) {
  const { port = 5000, cors = true, delay = 0 } = config;

  let code = `const express = require('express');\n`;
  if (cors) {
    code += `const cors = require('cors');\n`;
  }
  code += `const crypto = require('crypto');\n`;
  
  if (config.authEndpointEnabled) {
    code += `const jwt = require('jsonwebtoken');\n`;
    code += `const JWT_SECRET = process.env.JWT_SECRET || 'mock2block_secret_key';\n`;
  }

  code += `\nconst app = express();\n`;
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

  if (config.chaosMode) {
    code += `\n// Chaos Mode Middleware\n`;
    code += `app.use((req, res, next) => {\n`;
    code += `  const chance = Math.random() * 100;\n`;
    code += `  if (chance < ${config.chaosRate || 0}) {\n`;
    code += `    const errors = [500, 403, 502, 503];\n`;
    code += `    const randomError = errors[Math.floor(Math.random() * errors.length)];\n`;
    code += `    return res.status(randomError).json({ error: 'Chaos injected server error' });\n`;
    code += `  }\n`;
    code += `  next();\n`;
    code += `});\n`;
  }

  if (resources.some(r => r.requireAuth)) {
    code += `\n// Auth Middleware\n`;
    code += `const requireAuth = (req, res, next) => {\n`;
    code += `  const authHeader = req.headers.authorization;\n`;
    code += `  if (!authHeader || !authHeader.startsWith('Bearer ')) {\n`;
    code += `    return res.status(401).json({ error: 'Unauthorized' });\n`;
    code += `  }\n`;
    code += `  next();\n`;
    code += `};\n`;
  }

  code += `\n// In-memory Data Stores\n`;
  for (const res of resources) {
    const items = (mockDb && mockDb[res.name] && mockDb[res.name].length > 0)
      ? mockDb[res.name]
      : await seedResource(res.name, res.fields, 3);

    const formattedObjects = items.map(item => {
      const fieldLines = Object.entries(item).map(([key, value]) => {
        if (key === 'id') {
          return `id: crypto.randomUUID()`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      });
      return `  {\n    ${fieldLines.join(',\n    ')}\n  }`;
    });

    code += `const ${res.name} = [\n${formattedObjects.join(',\n')}\n];\n\n`;
  }

  if (config.authEndpointEnabled) {
    code += `\n// Mock Auth Login Endpoint\n`;
    code += `app.post('/api/auth/login', (req, res) => {\n`;
    code += `  const { email } = req.body;\n`;
    code += `  const token = jwt.sign({ email: email || 'mockuser@example.com' }, JWT_SECRET, { expiresIn: '1h' });\n`;
    code += `  res.json({ token, message: 'Mock login successful' });\n`;
    code += `});\n`;
  }

  code += `\n// CRUD Endpoints\n`;
  for (const res of resources) {
    const rName = res.name;
    const rPath = `/api/${rName}`;
    
    const authInjection = res.requireAuth ? 'requireAuth, ' : '';

    // GET all
    code += `\n// GET ${rPath}\n`;
    code += `app.get('${rPath}', ${authInjection}(req, res) => {\n`;
    code += `  let filteredData = [...${rName}];\n`;
    code += `  const { page, limit, ...filters } = req.query;\n`;
    
    code += `  \n`;
    code += `  // Query Filtering\n`;
    code += `  Object.entries(filters).forEach(([key, value]) => {\n`;
    code += `    filteredData = filteredData.filter(item => String(item[key]) === String(value));\n`;
    code += `  });\n`;
    code += `  \n`;
    code += `  // Pagination\n`;
    code += `  const pageNum = parseInt(page) || 1;\n`;
    code += `  const limitNum = parseInt(limit) || filteredData.length;\n`;
    code += `  const paginatedData = filteredData.slice((pageNum - 1) * limitNum, pageNum * limitNum);\n`;
    code += `  \n`;
    code += `  res.json({\n`;
    code += `    data: paginatedData,\n`;
    code += `    total: filteredData.length,\n`;
    code += `    page: pageNum,\n`;
    code += `    limit: limitNum\n`;
    code += `  });\n`;
    code += `});\n`;

    // GET by id
    code += `\n// GET ${rPath}/:id\n`;
    code += `app.get('${rPath}/:id', ${authInjection}(req, res) => {\n`;
    code += `  const item = ${rName}.find(i => String(i.id) === String(req.params.id));\n`;
    code += `  if (!item) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  res.json(item);\n`;
    code += `});\n`;

    // POST
    code += `\n// POST ${rPath}\n`;
    code += `app.post('${rPath}', ${authInjection}(req, res) => {\n`;
    code += `  const newItem = { id: crypto.randomUUID(), ...req.body };\n`;
    code += `  ${rName}.push(newItem);\n`;
    code += `  res.status(201).json(newItem);\n`;
    code += `});\n`;

    // PUT
    code += `\n// PUT ${rPath}/:id\n`;
    code += `app.put('${rPath}/:id', ${authInjection}(req, res) => {\n`;
    code += `  const index = ${rName}.findIndex(i => String(i.id) === String(req.params.id));\n`;
    code += `  if (index === -1) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  ${rName}[index] = { ...${rName}[index], ...req.body, id: ${rName}[index].id };\n`;
    code += `  res.json(${rName}[index]);\n`;
    code += `});\n`;

    // DELETE
    code += `\n// DELETE ${rPath}/:id\n`;
    code += `app.delete('${rPath}/:id', ${authInjection}(req, res) => {\n`;
    code += `  const index = ${rName}.findIndex(i => String(i.id) === String(req.params.id));\n`;
    code += `  if (index === -1) return res.status(404).json({ error: '${rName} not found' });\n`;
    code += `  const deletedItem = ${rName}.splice(index, 1)[0];\n`;
    code += `  res.json(deletedItem);\n`;
    code += `});\n`;
  }

  code += `\n// Start Server\n`;
  code += `app.listen(${config.port}, () => {\n`;
  code += `  console.log('🚀 Mock server running on http://localhost:${config.port}');\n`;
  code += `});\n`;

  return code;
}
