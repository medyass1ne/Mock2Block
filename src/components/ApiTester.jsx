import { useState, useEffect } from "react";
import dispatchMockRequest from "../lib/virtualDispatcher";

export default function ApiTester({ resources, mockDb, setMockDb, resetDb, config }) {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState(resources.length > 0 ? `/api/${resources[0].name}` : "");
  const [reqBody, setReqBody] = useState("{\n  \n}");
  const [reqHeaders, setReqHeaders] = useState("{\n  \"Authorization\": \"Bearer my-token\"\n}");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!path && resources.length > 0) {
      setPath(`/api/${resources[0].name}`);
    }
  }, [resources, path]);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      let parsedBody = null;
      if (method === "POST" || method === "PUT") {
        try {
          parsedBody = JSON.parse(reqBody);
        } catch (e) {
          setResponse({ status: 400, data: { error: "Invalid JSON body" }, timeMs: 0 });
          setIsLoading(false);
          return;
        }
      }
      let parsedHeaders = {};
      try {
        if (reqHeaders.trim()) {
          parsedHeaders = JSON.parse(reqHeaders);
        }
      } catch (e) {
        setResponse({ status: 400, data: { error: "Invalid JSON headers" }, timeMs: 0 });
        setIsLoading(false);
        return;
      }
      
      const result = await dispatchMockRequest(method, path, parsedBody, parsedHeaders, mockDb, config, resources);
      setResponse({
        status: result.status,
        data: result.data,
        timeMs: result.timeMs
      });
      setMockDb(result.newDb);
    } catch (err) {
      setResponse({ status: 500, data: { error: err.message }, timeMs: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return "text-green-400 bg-green-500/10 border-green-500/20";
    if (status >= 400 && status < 500) return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };

  const getMethodColor = (m) => {
    switch (m) {
      case 'GET': return 'text-blue-400';
      case 'POST': return 'text-green-400';
      case 'PUT': return 'text-amber-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full gap-5 pb-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">API Tester</h2>
          <button 
            onClick={() => {
              resetDb();
              setResponse(null);
            }}
            className="px-3 py-1.5 text-xs font-semibold tracking-wide text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Data
          </button>
        </div>
        <p className="text-neutral-400 text-sm">
          A sandbox environment simulating your virtual Express server routes in real-time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select 
          value={method} 
          onChange={(e) => setMethod(e.target.value)}
          className={`bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-white/20 transition-colors ${getMethodColor(method)}`}
        >
          <option value="GET" className="bg-black text-white">GET</option>
          <option value="POST" className="bg-black text-white">POST</option>
          <option value="PUT" className="bg-black text-white">PUT</option>
          <option value="DELETE" className="bg-black text-white">DELETE</option>
        </select>
        <div className="flex-1 relative group">
          <input 
            type="text" 
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/resource"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all shadow-inner"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isLoading || !path}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              Send
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-[10px] uppercase font-semibold text-neutral-500 mr-1 mt-1">Endpoints:</span>
        {resources.map(res => (
          <button
            key={res.name}
            onClick={() => {
              setPath(`/api/${res.name}`);
              setMethod("GET");
            }}
            className="px-2.5 py-1 text-[11px] font-mono text-neutral-400 hover:text-cyan-300 bg-white/[0.03] hover:bg-cyan-500/10 rounded-md border border-white/5 hover:border-cyan-500/20 transition-all cursor-pointer"
          >
            /{res.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 pt-2">
        <div className="flex flex-col lg:w-1/2 min-h-0">
          {(method === "POST" || method === "PUT") && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Request Body (JSON)</label>
              </div>
              <textarea
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-neutral-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent custom-scrollbar transition-all shadow-inner"
                spellCheck="false"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Request Headers (JSON)</label>
            </div>
            <textarea
              value={reqHeaders}
              onChange={(e) => setReqHeaders(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-neutral-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent custom-scrollbar transition-all shadow-inner"
              spellCheck="false"
            />
          </div>
        </div>
        
        <div className="flex flex-col lg:w-1/2 min-h-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Response
            </div>
            {response && (
              <div className="flex gap-2 text-[10px] font-bold">
                <span className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${getStatusColor(response.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(response.status).split(' ')[0].replace('text', 'bg')}`}></div>
                  {response.status}
                </span>
                <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-300">
                  {response.timeMs} ms
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[200px] bg-black/60 border border-white/10 rounded-xl overflow-auto custom-scrollbar p-4 relative shadow-inner">
            {!response && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 text-sm gap-2">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Enter a URL and click Send to see the response
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-400/70 text-sm animate-pulse gap-3">
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {config.delay > 0 ? `Simulating ${config.delay}ms network delay...` : 'Dispatching request...'}
              </div>
            )}
            {response && !isLoading && (
              <pre className="text-xs sm:text-sm font-mono text-neutral-300">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
