export default function ApiDocs({ resources, config }) {
  // Generate a mock object based on fields for request/response bodies
  const generateMockObject = (fields) => {
    const obj = {};
    fields.forEach(field => {
      if (field.type === 'string') obj[field.name] = "string";
      else if (field.type === 'number') obj[field.name] = 0;
      else if (field.type === 'boolean') obj[field.name] = true;
    });
    return obj;
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'POST': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'PUT': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DELETE': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">API Documentation</h2>
        <p className="text-neutral-400 text-sm">
          Auto-generated documentation for your Mock2Block server running on <span className="text-cyan-400 font-mono">http://localhost:{config.port}</span>.
        </p>
      </div>

      {resources.length === 0 && (
        <div className="text-center py-10 text-neutral-500">
          No resources defined yet. Add some endpoints to generate documentation.
        </div>
      )}

      {resources.map((res, i) => {
        const mockObj = generateMockObject(res.fields);
        const mockResponse = { id: "uuid-v4-string", ...mockObj };
        
        const endpoints = [
          { method: 'GET', path: `/api/${res.name}`, desc: `Retrieve all ${res.name}`, hasBody: false, response: [mockResponse] },
          { method: 'GET', path: `/api/${res.name}/:id`, desc: `Retrieve a specific ${res.name.slice(0, -1)} by ID`, hasBody: false, response: mockResponse },
          { method: 'POST', path: `/api/${res.name}`, desc: `Create a new ${res.name.slice(0, -1)}`, hasBody: true, reqBody: mockObj, response: mockResponse },
          { method: 'PUT', path: `/api/${res.name}/:id`, desc: `Update an existing ${res.name.slice(0, -1)} by ID`, hasBody: true, reqBody: mockObj, response: mockResponse },
          { method: 'DELETE', path: `/api/${res.name}/:id`, desc: `Delete a ${res.name.slice(0, -1)} by ID`, hasBody: false, response: mockResponse },
        ];

        return (
          <div key={i} className="space-y-4">
            <h3 className="text-xl font-semibold capitalize text-white flex items-center gap-3 border-b border-white/10 pb-2">
              <span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              {res.name}
              <span className="text-xs font-normal text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 ml-auto">
                {res.fields.length} field{res.fields.length !== 1 ? 's' : ''}
              </span>
            </h3>
            
            <div className="space-y-3">
              {endpoints.map((ep, j) => (
                <div key={j} className="border border-white/5 bg-black/20 rounded-xl overflow-hidden flex flex-col group/ep hover:border-white/10 transition-colors">
                  <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border w-16 text-center ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-neutral-300 text-sm sm:text-base">
                        {ep.path}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-400">{ep.desc}</span>
                  </div>
                  
                  <div className="p-4 border-t border-white/5 bg-black/40 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ep.hasBody && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Request Body
                        </div>
                        <pre className="text-xs font-mono text-neutral-300 bg-black/60 p-3 rounded-lg border border-white/5 overflow-x-auto h-full max-h-48 custom-scrollbar">
                          {JSON.stringify(ep.reqBody, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <div className={`space-y-2 ${!ep.hasBody ? 'lg:col-span-2' : ''}`}>
                      <div className="text-[10px] text-green-500/70 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Response (200 OK)
                      </div>
                      <pre className="text-xs font-mono text-neutral-300 bg-black/60 p-3 rounded-lg border border-green-500/10 overflow-x-auto h-full max-h-48 custom-scrollbar">
                        {JSON.stringify(ep.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
