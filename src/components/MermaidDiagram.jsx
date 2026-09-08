"use client";

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function MermaidDiagram({ chartString }) {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Pan and Zoom State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!chartString || !containerRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            background: 'transparent',
            primaryColor: '#18181b', // zinc-900
            primaryTextColor: '#f4f4f5', // zinc-100
            primaryBorderColor: '#27272a', // zinc-800
            lineColor: '#52525b', // zinc-600
            secondaryColor: '#09090b', // zinc-950
            tertiaryColor: '#09090b',
            edgeLabelBackground: '#09090b',
            attributeBackgroundColorEven: '#09090b',
            attributeBackgroundColorOdd: '#18181b',
          },
          er: {
            diagramPadding: 20,
            layoutDirection: 'TB',
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            useMaxWidth: true,
          },
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        });

        const id = `mermaid-er-${Date.now()}`;
        const { svg } = await mermaid.render(id, chartString);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make SVG fill container width nicely
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Mermaid render error:', err);
          setError('Failed to render diagram. Check your resource names for special characters.');
        }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [chartString]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chartString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!chartString) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <div>
          <p className="text-white/70 font-medium mb-1">No Resources Yet</p>
          <p className="text-white/40 text-sm">Add an endpoint to generate your ER diagram</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-center p-8">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
          </svg>
        </div>
        <p className="text-red-400/80 text-sm">{error}</p>
      </div>
    );
  }

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY * -0.001;
      setScale(s => Math.min(Math.max(0.2, s + zoomFactor), 4));
    }
  };

  const zoomIn = () => setScale(s => Math.min(4, s + 0.2));
  const zoomOut = () => setScale(s => Math.max(0.2, s - 0.2));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-black/20 rounded-xl border border-white/5" onWheel={handleWheel}>
      {/* Top right actions */}
      <button
        onClick={handleCopy}
        title="Copy Mermaid syntax"
        className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-xs text-white/50 hover:text-white/90 transition-all shadow-lg backdrop-blur-sm"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy Syntax'}
      </button>

      {/* Bottom right zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1 shadow-lg backdrop-blur-sm">
        <button onClick={zoomOut} className="p-1.5 hover:bg-white/10 rounded-md text-white/50 hover:text-white/90 transition-colors" title="Zoom Out">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <button onClick={resetZoom} className="px-2 py-1 text-[10px] font-mono font-medium hover:bg-white/10 rounded-md text-white/50 hover:text-white/90 transition-colors" title="Reset Zoom">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn} className="p-1.5 hover:bg-white/10 rounded-md text-white/50 hover:text-white/90 transition-colors" title="Zoom In">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* Draggable canvas */}
      <div 
        className={`w-full h-full flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <div 
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="flex justify-center items-center"
        >
          <div ref={containerRef} className="pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
