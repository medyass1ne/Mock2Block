/**
 * Generates a Mermaid ER diagram string from the given resources array.
 * @param {Array} resources - Array of resource objects { name, fields: [{ name, type }] }
 * @returns {string} Mermaid erDiagram syntax
 */
export default function generateERDiagram(resources) {
  if (!resources || resources.length === 0) return '';

  // Map JS/mock types to valid Mermaid ER types
  const typeMap = {
    string: 'string',
    number: 'int',
    boolean: 'boolean',
    object: 'object',
    array: 'string',
  };

  let diagram = 'erDiagram\n';

  // Build entity blocks
  resources.forEach((res) => {
    const entityName = res.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    diagram += `  ${entityName} {\n`;
    (res.fields || []).forEach((field) => {
      const mType = typeMap[field.type] || 'string';
      const fieldName = field.name.replace(/[^a-zA-Z0-9_]/g, '_');
      diagram += `    ${mType} ${fieldName}\n`;
    });
    diagram += `  }\n`;
  });

  // Auto-detect relationships from field names (e.g., userId → links to USER)
  const entityNames = resources.map((r) =>
    r.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  );

  resources.forEach((res) => {
    const entityName = res.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    (res.fields || []).forEach((field) => {
      // Look for patterns like userId, post_id, authorId
      const match = field.name.match(/^(.+?)(?:_?[Ii]d)$/);
      if (match) {
        const referencedName = match[1].toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (entityNames.includes(referencedName) && referencedName !== entityName) {
          diagram += `  ${referencedName} ||--o{ ${entityName} : "has"\n`;
        }
      }
    });
  });

  return diagram;
}
