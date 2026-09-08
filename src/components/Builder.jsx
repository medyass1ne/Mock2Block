"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import dynamic from 'next/dynamic';
import generateExpress from "../lib/generateExpress";
import SpotlightCard from "../components/SpotlightCard";
import SpecularButton from "../components/SpecularButton";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ApiDocs from "../components/ApiDocs";
import ApiTester from "../components/ApiTester";
import generateMarkdownDocs from "../lib/generateMarkdownDocs";
import { seedResource } from "../lib/smartFaker";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { exportToOpenAPI, exportToPostman } from "../lib/exporters";
import DotField from "./DotField";
import { Zap, Lock, Globe, Search, Sparkles, Globe2 } from "lucide-react";
import GradualBlur from "./GradualBlur";
import generateERDiagram from "../lib/generateMermaid";

const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-neutral-500 text-sm">
      Loading visualizer...
    </div>
  ),
});



const VirtualEndpoint = ({ children }) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Lock the exact height before unmounting children to preserve scroll position
          setHeight(currentRef.getBoundingClientRect().height || 200);
          setIsVisible(false);
        }
      },
      { rootMargin: "0px 0px" } // Strictly unrender when out of view
    );
    
    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height: isVisible ? 'auto' : `${height}px` }} className="w-full">
      {isVisible ? children : null}
    </div>
  );
};

export default function Builder({ initialData = null, projectId = null, initialUser = null }) {
  const router = useRouter();
  const { user, setUser, setShowAuthModal, setAuthReason, handleLogout } = useAuth();
  const [config, setConfig] = useState({ port: 5000, cors: true, delay: 0, chaosMode: false, chaosRate: 10, authEndpointEnabled: false, ...(initialData?.config || {}) });
  const [resources, setResources] = useState(initialData?.resources || [
    {
      name: "todos",
      fields: [
        { name: "title", type: "string" },
        { name: "completed", type: "boolean" },
      ],
    },
  ]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mockDb, setMockDb] = useState(initialData?.mockDb || null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState("");
                          const [projects, setProjects] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [verifiedAlert, setVerifiedAlert] = useState(null);
  const fileInputRef = useRef(null);

  const searchParams = useSearchParams();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
                      
  const showTooltip = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const hideTooltip = () => setTooltip(t => ({ ...t, visible: false }));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      const presetId = params.get('preset');
      if (presetId) {
        fetch(`/api/presets/${presetId}`)
          .then(res => res.json())
          .then(data => {
            if (data.preset) {
              setConfig(data.preset.config || { port: 5000, delay: 0, cors: true });
              setResources(data.preset.resources || []);
              
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              
              setVerifiedAlert({
                type: 'success',
                title: 'Preset Loaded!',
                message: `Successfully loaded preset: ${data.preset.title}`
              });
            }
          })
          .catch(err => console.error("Failed to load preset:", err));
      }

      const verified = params.get('verified');
      if (verified === 'success') {
        setVerifiedAlert({
          type: 'success',
          message: 'Account is now verified, you can now sign in!'
        });
        setAuthMode('login');
        setAuthSuccess('Account is now verified, you can now sign in!');
        setShowAuthModal(true);
      } else if (verified === 'already') {
        setVerifiedAlert({
          type: 'info',
          message: 'Your email is already verified. You can sign in.'
        });
        setAuthMode('login');
        setAuthSuccess('Your email is already verified. You can sign in.');
        setShowAuthModal(true);
      }
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      setDeployUrl(`${window.location.protocol}//${window.location.host}/projects/${projectId}/test/api`);
    }
  }, [projectId]);

  const initializeDb = async () => {
    const newDb = {};
    for (const res of resources) {
      newDb[res.name] = await seedResource(res.name, res.fields, 3);
    }
    setMockDb(newDb);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      initializeDb();
    }, 300);
    return () => clearTimeout(handler);
  }, [resources]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setUser(data.username);
        setProjects(data.projects);
      } else {
        setUser(null);
        if (activeTab === 'dashboard') setActiveTab('code');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      generateExpress(config, resources, mockDb).then(setGeneratedCode);
    }, 300);
    return () => clearTimeout(handler);
  }, [config, resources, mockDb]);

  useEffect(() => {
    if (!projectId && !initialData) {
      const savedConfig = localStorage.getItem("mock2block_config");
      const savedResources = localStorage.getItem("mock2block_resources");
      if (savedConfig) setConfig(JSON.parse(savedConfig));
      if (savedResources) setResources(JSON.parse(savedResources));
    }
  }, [projectId, initialData]);

  useEffect(() => {
    // Only auto-save if we have something substantial and not initial empty load
    if (!resources || resources.length === 0 || !mockDb) return;
    
    const handler = setTimeout(() => {
      if (projectId) {
        if (!user) return; // Only autosave if user is authenticated and owns it
        fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, resources, mockDb, projectId })
        }).catch(err => console.error("Auto-save failed:", err));
      } else {
        localStorage.setItem("mock2block_config", JSON.stringify(config));
        localStorage.setItem("mock2block_resources", JSON.stringify(resources));
      }
    }, 2000);
    
    return () => clearTimeout(handler);
  }, [config, resources, mockDb, projectId, user]);

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const loadPreset = (type) => {
    if (type === "todos") {
      setResources([
        {
          name: "todos",
          fields: [
            { name: "title", type: "string" },
            { name: "completed", type: "boolean" },
          ],
        },
      ]);
    } else if (type === "ecommerce") {
      setResources([
        {
          name: "products",
          fields: [
            { name: "name", type: "string" },
            { name: "price", type: "number" },
            { name: "inStock", type: "boolean" },
          ],
        },
        {
          name: "orders",
          fields: [
            { name: "productId", type: "string" },
            { name: "quantity", type: "number" },
            { name: "shipped", type: "boolean" },
          ],
        },
      ]);
    }
  };

  const addResource = () => {
    setResources((prev) => [
      ...prev,
      { name: "new_resource", requireAuth: false, fields: [{ name: "field_name", type: "string" }] },
    ]);
  };

  const removeResource = (index) => {
    setResources((prev) => prev.filter((_, i) => i !== index));
  };

  const updateResourceName = (index, name) => {
    const newResources = [...resources];
    newResources[index].name = name;
    setResources(newResources);
  };

  const updateResourceAuth = (index, requireAuth) => {
    const newResources = [...resources];
    newResources[index].requireAuth = requireAuth;
    setResources(newResources);
  };

  const addField = (resIndex) => {
    const newResources = [...resources];
    newResources[resIndex].fields.push({ name: "new_field", type: "string", mockType: "auto" });
    setResources(newResources);
  };

  const removeField = (resIndex, fieldIndex) => {
    const newResources = [...resources];
    newResources[resIndex].fields.splice(fieldIndex, 1);
    setResources(newResources);
  };

  const updateField = (resIndex, fieldIndex, key, value) => {
    const newResources = [...resources];
    newResources[resIndex].fields[fieldIndex][key] = value;
    if (key === 'type') {
      newResources[resIndex].fields[fieldIndex].mockType = 'auto';
    }
    setResources(newResources);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (type) => {
    setShowDownloadMenu(false);
    let content = "";
    let filename = "";
    
    if (type === "code") {
      content = generatedCode;
      filename = "server.js";
    } else {
      content = generateMarkdownDocs(config, resources);
      filename = "api-docs.md";
    }
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeploy = async () => {
    if (!user) {
      setAuthReason("deploy");
      setShowAuthModal(true);
      return;
    }
    if (isDeploying || !mockDb) return;
    setIsDeploying(true);
    setDeployUrl("");
    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, resources, mockDb })
      });
      const data = await response.json();
      if (response.ok && data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        throw new Error(data.error || "Deploy failed");
      }
    } catch (err) {
      console.error(err);
      window.alert("Failed to deploy API to cloud.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handlePublishPreset = async (e) => {
    e.preventDefault();
    setPublishLoading(true);
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: publishTitle, description: publishDesc, config, resources })
      });
      const data = await res.json();
      if (res.ok) {
        setShowPublishModal(false);
        setPublishTitle("");
        setPublishDesc("");
        setVerifiedAlert({
          type: 'success',
          title: 'Preset Published!',
          message: 'Preset published successfully to the Discover page!'
        });
      } else {
        window.alert(data.error || "Failed to publish preset");
      }
    } catch (e) {
      window.alert("Network error while publishing preset");
    } finally {
      setPublishLoading(false);
    }
  };

  const extractPdfText = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  const generateFromAI = async () => {
    if (!user) {
      setAuthReason("generate");
      setShowAuthModal(true);
      return;
    }
    if (!aiPrompt.trim() && !uploadedFile) return;
    setIsGenerating(true);
    
    try {
      let promptText = aiPrompt;

      if (uploadedFile) {
        let extractedText = '';
        if (uploadedFile.type === 'application/pdf') {
          extractedText = await extractPdfText(uploadedFile);
        } else {
          extractedText = await uploadedFile.text();
        }
        // Truncate to 25,000 chars to avoid blowing the context window
        if (extractedText.length > 25000) {
          extractedText = extractedText.substring(0, 25000) + '\n\n[...truncated]';
        }
        promptText = `Here is the API documentation. Generate the schema based on this:\n\n${extractedText}`;
        if (aiPrompt.trim()) {
          promptText = `${aiPrompt.trim()}\n\nHere is the uploaded documentation:\n\n${extractedText}`;
        }
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });
      
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          window.alert(data.error || "Daily AI generation limit reached.");
        } else {
          window.alert(data.error || "Failed to generate AI resources.");
        }
        return;
      }

      if (data.resources && Array.isArray(data.resources)) {
        setResources(data.resources);
        setAiPrompt("");
        setUploadedFile(null);
      } else {
        console.error("Invalid AI response format");
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      window.alert("Network error while generating AI resources.");
    } finally {
      setIsGenerating(false);
    }
  };

  const MemoizedCodeBlock = useMemo(() => (
    <SyntaxHighlighter
      language="javascript"
      style={vscDarkPlus}
      className="custom-scrollbar"
      customStyle={{
        margin: 0,
        padding: 0,
        background: 'transparent',
        fontSize: '0.875rem',
        lineHeight: '1.625'
      }}
    >
      {generatedCode}
    </SyntaxHighlighter>
  ), [generatedCode]);

  const renderCodePreview = (isOverlay = false) => (
    <motion.div 
      layoutId="preview-box"
      className={`flex-none xl:flex-1 bg-[#09090b] border border-zinc-800 ${isOverlay ? 'rounded-2xl h-full' : 'rounded-3xl'} overflow-hidden shadow-2xl flex flex-col relative group ${!isOverlay ? 'h-[70vh] min-h-[400px] xl:h-auto' : ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-transparent pointer-events-none"></div>
      
      <div className={`bg-zinc-900/50 px-4 sm:px-5 py-4 border-b border-zinc-800 flex ${isFullscreen ? "flex-row-reverse" : "flex-col"} gap-4 items-center justify-between backdrop-blur-md relative z-20`}>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="relative">
            <div onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="cursor-pointer">
              <SpecularButton size="sm" className="!py-1.5 !px-3 !rounded-lg text-xs" autoAnimate>
                <span className="flex items-center gap-2" aria-label="Download options">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </span>
              </SpecularButton>
            </div>
            
            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-[#0c1017]/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50">
                  <button 
                    onClick={() => handleDownload("code")}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Download server.js
                  </button>
                  <button 
                    onClick={() => handleDownload("docs")}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download API Docs (.md)
                  </button>
                  <button 
                    onClick={() => { setShowDownloadMenu(false); exportToOpenAPI(config, resources); }}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Export OpenAPI 3.0 (JSON)
                  </button>
                  <button 
                    onClick={() => { setShowDownloadMenu(false); exportToPostman(config, resources); }}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Export Postman Collection
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div onClick={copyToClipboard} className="cursor-pointer" role="button" aria-label="Copy code to clipboard">
            <SpecularButton size="sm" className="!py-1.5 !px-3 !rounded-lg text-xs" autoAnimate>
              {copied ? (
                <span className="flex items-center gap-2 text-green-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </span>
              )}
            </SpecularButton>
          </div>
          <div onClick={() => setIsFullscreen(!isFullscreen)} className="cursor-pointer" role="button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            <SpecularButton size="sm" className="!py-1.5 !px-3 !rounded-lg text-xs" autoAnimate>
              <span className="flex items-center gap-2">
                {isFullscreen ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </>
                )}
              </span>
            </SpecularButton>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full xl:w-auto overflow-hidden">
          <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800 mx-auto xl:ml-2 overflow-x-auto whitespace-nowrap hide-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider ${activeTab === 'code' ? 'bg-zinc-800/50 text-zinc-300 shadow-sm border border-zinc-700' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              server.js
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'docs' ? 'bg-zinc-800/50 text-zinc-300 shadow-sm border border-zinc-700' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              API Docs
            </button>
            <button
              onClick={() => setActiveTab("tester")}
              className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'tester' ? 'bg-zinc-800/50 text-zinc-300 shadow-sm border border-zinc-700' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              API Tester
            </button>
            <button
              onClick={() => setActiveTab("visualize")}
              className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'visualize' ? 'bg-zinc-800/50 text-zinc-300 shadow-sm border border-zinc-700' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Visualize
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-auto flex-1 custom-scrollbar relative z-10 text-sm">
        {activeTab === 'code' && (
          <motion.div layout>
            {MemoizedCodeBlock}
          </motion.div>
        )}
        {activeTab === 'docs' && <ApiDocs resources={resources} config={config} />}
        {activeTab === 'tester' && mockDb && (
          <ApiTester 
            resources={resources} 
            mockDb={mockDb} 
            setMockDb={setMockDb} 
            resetDb={initializeDb}
            config={config} 
          />
        )}
        {activeTab === 'visualize' && (
          <MermaidDiagram chartString={generateERDiagram(resources)} />
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {/* Global Floating Tooltip Portal */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] w-48 p-2 rounded-lg bg-[#0c1017]/95 backdrop-blur-md border border-zinc-800 shadow-xl text-xs text-white/70 text-center pointer-events-none transition-opacity"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
      {/* Gradual Blur - Fixed Bottom */}
      <GradualBlur
        position="bottom"
        height="3rem"
        strength={1}
        zIndex={50}
        curve="ease-out"
        divCount={4}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}
      />
      {/* Verified Banner Alert */}
      <AnimatePresence>
        {verifiedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg px-4"
          >
            <div className="bg-emerald-950/90 border border-zinc-700 backdrop-blur-md text-zinc-300 px-5 py-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center flex-shrink-0 text-zinc-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{verifiedAlert.title || (verifiedAlert.type === 'info' ? 'Notice' : 'Success!')}</h4>
                  <p className="text-xs text-zinc-300/90">{verifiedAlert.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!user && (
                  <button
                    onClick={() => {
                      setAuthReason("login");
                      setAuthMode("login");
                      setAuthSuccess("Account is now verified, you can now sign in!");
                      setShowAuthModal(true);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black border-0 text-xs font-bold rounded-xl transition-all shadow-md flex-shrink-0"
                  >
                    Sign In
                  </button>
                )}
                <button
                  onClick={() => setVerifiedAlert(null)}
                  className="p-1 text-zinc-300 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal Trigger / Profile (Now moved to Navbar) */}



      {showPublishModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowPublishModal(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 relative z-10 flex items-center gap-2">
              <Globe className="w-6 h-6 text-zinc-300" />
              Publish Preset
            </h2>
            <form onSubmit={handlePublishPreset} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Preset Title</label>
                <input type="text" required value={publishTitle} onChange={e => setPublishTitle(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-600 transition-all" placeholder="e.g. E-Commerce Storefront" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Description (Optional)</label>
                <textarea rows={3} value={publishDesc} onChange={e => setPublishDesc(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-600 transition-all" placeholder="A brief description of this API schema..." />
              </div>
              <button type="submit" disabled={publishLoading} className="w-full py-3 mt-2 bg-white hover:bg-zinc-200 text-black border-0 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50">
                {publishLoading ? 'Publishing...' : 'Publish to Community'}
              </button>
            </form>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] p-4 sm:p-8 bg-black/90 backdrop-blur-md flex flex-col"
          >
            {renderCodePreview(true)}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
        
        {/* New Premium Navbar */}
        


        <div className="relative z-10 p-4 sm:p-8 md:p-12">
          <div className="max-w-[1400px] mx-auto space-y-12">

        {deployUrl && (
          <div className="z-10 relative animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-zinc-800/50 border border-zinc-700 backdrop-blur-md rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-300 border border-zinc-700">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Deployed Successfully!</h3>
                  <p className="text-zinc-300/70 text-sm mt-0.5">Your API is live and ready to consume from your frontend app.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-zinc-800 rounded-lg p-1.5 w-full sm:w-auto relative z-10 shadow-inner">
                <input type="text" readOnly value={deployUrl} className="bg-transparent text-sm font-mono text-zinc-300 px-3 py-1.5 focus:outline-none w-full sm:w-80 truncate" />
                <button 
                  onClick={() => navigator.clipboard.writeText(deployUrl)}
                  className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 text-sm font-semibold rounded-md transition-colors whitespace-nowrap border border-zinc-700 hover:text-white"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        <motion.div 
          className="flex flex-col-reverse xl:grid xl:grid-cols-12 gap-8 items-stretch xl:items-start w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Left Column: Spec Builder */}
          <div className="w-full xl:col-span-7 space-y-8">
            
            {/* Global Settings */}
            <section className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 shadow-sm rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-500 hover:bg-zinc-800/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-300 border border-zinc-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Global Settings
                </h2>
                {!projectId && (
                  <div onClick={handleDeploy} className={`cursor-pointer ${isDeploying ? 'opacity-50 pointer-events-none' : ''}`}>
                    <SpecularButton size="sm" baseColor="#52525b" className="text-sm rounded-xl !bg-transparent !border-zinc-700 hover:!bg-zinc-800" autoAnimate>
                      {isDeploying ? "Deploying..." : <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg> Deploy to Cloud</span>}
                    </SpecularButton>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-2">
                  <label htmlFor="port-number" className="block text-sm font-medium text-neutral-400">Port Number</label>
                  <input
                    id="port-number"
                    type="number"
                    name="port"
                    value={config.port ?? 5000}
                    onChange={handleConfigChange}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 hover:border-white/20 transition-all shadow-inner font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="simulated-delay" className="block text-sm font-medium text-neutral-400">Simulated Delay (ms)</label>
                  <input
                    id="simulated-delay"
                    type="number"
                    name="delay"
                    value={config.delay ?? 0}
                    onChange={handleConfigChange}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 hover:border-white/20 transition-all shadow-inner font-mono"
                  />
                </div>
                <div className="flex items-center sm:items-center pb-2">
                  <label className="flex items-center cursor-pointer group w-full justify-between sm:justify-start gap-4">
                    <span className="text-sm font-medium text-neutral-400">Enable CORS</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="cors"
                        checked={config.cors ?? false}
                        onChange={handleConfigChange}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-all duration-300 ${config.cors ? 'bg-white shadow-sm' : 'bg-black/50 border border-zinc-800 group-hover:border-white/20'}`}></div>
                      <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${config.cors ? 'bg-black transform translate-x-6' : 'bg-white'}`}></div>
                    </div>
                  </label>
                </div>
                <div className="flex items-center sm:items-center pb-2">
                  <label className="flex items-center cursor-pointer group w-full justify-between sm:justify-start gap-4">
                    <span className="text-sm font-medium text-neutral-400">Auth Endpoint (/api/auth/login)</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="authEndpointEnabled"
                        checked={config.authEndpointEnabled ?? false}
                        onChange={handleConfigChange}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-all duration-300 ${config.authEndpointEnabled ? 'bg-white shadow-sm' : 'bg-black/50 border border-zinc-800 group-hover:border-white/20'}`}></div>
                      <div className={`dot absolute left-1 top-1 w-6 h-6 rounded-full transition-all duration-300 shadow-sm ${config.authEndpointEnabled ? 'bg-black transform translate-x-6' : 'bg-white'}`}></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Chaos Mode */}
              <div className="mt-6 pt-6 border-t border-zinc-800 relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center sm:items-center">
                  <label className="flex items-center cursor-pointer group/chaos w-full justify-between sm:justify-start gap-4">
                    <div className="relative flex items-center gap-2 cursor-help w-fit"
                      onMouseEnter={(e) => showTooltip(e, 'Randomly injects server errors (e.g., 500, 403) into your API responses based on the chosen percentage to help test frontend resilience.')}
                      onMouseLeave={hideTooltip}
                    >
                      <span className="text-sm font-medium text-red-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                        Chaos Mode
                      </span>
                      <span className="flex items-center justify-center w-4 h-4 rounded-full border border-white/20 text-[10px] text-white/50 group-hover/chaos:text-white/90 group-hover/chaos:border-zinc-8000 transition-colors">
                        ?
                      </span>
                      <div className="hidden"></div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="chaosMode"
                        checked={config.chaosMode ?? false}
                        onChange={handleConfigChange}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-all duration-300 ${config.chaosMode ? 'bg-red-500 shadow-sm' : 'bg-black/50 border border-zinc-800 group-hover/chaos:border-white/20'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-sm ${config.chaosMode ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>

                {config.chaosMode && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-red-400">Chaos Rate</label>
                      <span className="text-xs font-mono text-white/70 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">{config.chaosRate}%</span>
                    </div>
                    <input
                      type="range"
                      name="chaosRate"
                      min="0"
                      max="100"
                      value={config.chaosRate ?? 10}
                      onChange={handleConfigChange}
                      aria-label="Chaos error injection rate percentage"
                      className="w-full accent-red-500 h-2 bg-black/40 rounded-lg appearance-none cursor-pointer border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Presets */}
            <section className="flex flex-col flex-wrap justify-between gap-4 bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
              <div className="flex flex-wrap items-center justify-between width-[100% gap-3 ml-auto">
                <Link href="/discover" className="cursor-pointer block">
                  <SpecularButton size="sm" baseColor="#52525b" className="text-sm whitespace-nowrap rounded-xl !bg-transparent !border-zinc-700 hover:!bg-zinc-800 text-zinc-300" autoAnimate>
                    <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Discover Presets</span>
                  </SpecularButton>
                </Link>
                {user && (
                  <div onClick={() => setShowPublishModal(true)} className="cursor-pointer">
                    <SpecularButton size="sm" baseColor="#52525b" className="text-sm whitespace-nowrap rounded-xl !bg-transparent !border-zinc-700 hover:!bg-zinc-800 text-zinc-300" autoAnimate>
                      <span className="flex items-center gap-2"><Globe2 className="w-4 h-4" /> Publish as Preset</span>
                    </SpecularButton>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-neutral-400 px-2 whitespace-nowrap">Quick Presets:</span>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => loadPreset("todos")} className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors border border-zinc-700 cursor-pointer">
                    Load Todo App
                  </button>
                  <button onClick={() => loadPreset("ecommerce")} className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-sm font-medium rounded-xl transition-colors border border-zinc-700 cursor-pointer">
                    Load E-commerce
                  </button>
                </div>
              </div>
            </section>

            {/* AI Generation */}
            <section className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 shadow-sm rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-500 hover:bg-zinc-800/50">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-300 border border-zinc-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                Generate with AI
              </h2>
              
              <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. A blog with posts and comments containing author, body, and timestamp"
                    aria-label="Describe your API schema for AI generation"
                    className="flex-1 bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 hover:border-white/20 transition-all shadow-inner placeholder-neutral-500"
                    disabled={isGenerating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') generateFromAI();
                    }}
                  />
                  <div className="flex gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.md,.txt,.html,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setUploadedFile(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-4 py-3 rounded-xl font-medium transition-all shadow-lg border whitespace-nowrap bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-zinc-800 hover:border-white/20 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Docs
                    </button>
                    <button
                      onClick={generateFromAI}
                      disabled={isGenerating || (user && !aiPrompt.trim() && !uploadedFile)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all shadow-lg border whitespace-nowrap ${
                        isGenerating || (user && !aiPrompt.trim() && !uploadedFile)
                          ? 'bg-zinc-800/50 text-zinc-300/40 border-purple-500/10 cursor-not-allowed'
                          : 'bg-white hover:bg-zinc-200 text-black border-0 border-purple-400 hover:shadow-sm'
                      }`}
                    >
                      {isGenerating ? "Generating..." : (!user ? "Sign in to generate" : <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Generate API</span>)}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {uploadedFile && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-2.5 w-fit"
                    >
                      <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-zinc-300 font-medium truncate max-w-[200px]">{uploadedFile.name}</span>
                      <span className="text-xs text-zinc-300/60">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-zinc-300/60 hover:text-zinc-300 transition-colors ml-1 p-0.5 hover:bg-zinc-800/50 rounded-md"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Resources */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-2 bg-zinc-800/50 rounded-lg text-zinc-300 border border-zinc-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  API Resources
                </h2>
                <button
                  onClick={addResource}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-zinc-800/50 hover:bg-zinc-800/50 text-zinc-300 rounded-xl text-sm font-medium transition-all duration-300 border border-zinc-700 hover:border-zinc-700 hover:shadow-sm"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Endpoint
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {isGenerating ? (
                  <SkeletonTheme baseColor="#18181b" highlightColor="#27272a">
                    <Skeleton height={80} className="mb-4" borderRadius={12} />
                    <Skeleton height={80} className="mb-4" borderRadius={12} />
                    <Skeleton height={80} className="mb-4" borderRadius={12} />
                  </SkeletonTheme>
                ) : (
                  resources.map((res, resIndex) => (
                    <VirtualEndpoint key={res.id || `resource-${resIndex}`}>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <SpotlightCard className="rounded-3xl border border-zinc-800 bg-zinc-900/50 shadow-xl" spotlightColor="rgba(99, 102, 241, 0.1)">
                        <div className="p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3 w-full sm:max-w-sm">
                          <span className="text-neutral-500 font-mono text-lg bg-black/40 px-4 py-2 rounded-l-xl border border-r-0 border-zinc-800">
                            /api/
                          </span>
                          <input
                            type="text"
                            value={res.name || ""}
                            onChange={(e) => updateResourceName(resIndex, e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                            className="w-full bg-black/40 border border-zinc-800 rounded-r-xl px-4 py-2 text-white text-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-all font-mono shadow-inner -ml-3 hover:border-white/20"
                            placeholder="resource_name"
                          />
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                          <label className="flex items-center cursor-pointer group/auth gap-2">
                            <div className="relative flex items-center gap-2 cursor-help w-fit"
                              onMouseEnter={(e) => showTooltip(e, 'Requires requests to this endpoint to include a valid Bearer token in the Authorization header.')}
                              onMouseLeave={hideTooltip}
                            >
                              <span className="text-xs font-medium text-zinc-300/80 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Require Auth</span>
                              <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/20 text-[9px] text-white/50 group-hover/auth:text-white/90 group-hover/auth:border-zinc-8000 transition-colors">
                                ?
                              </span>
                              <div className="hidden"></div>
                            </div>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={res.requireAuth ?? false}
                                onChange={(e) => updateResourceAuth(resIndex, e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`block w-10 h-6 rounded-full transition-all duration-300 ${res.requireAuth ? 'bg-amber-500 shadow-sm' : 'bg-black/50 border border-zinc-800 group-hover/auth:border-white/20'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${res.requireAuth ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                          <button
                            onClick={() => removeResource(resIndex)}
                            className="text-neutral-500 hover:text-red-400 bg-red-500/0 hover:bg-red-500/10 transition-all p-2.5 rounded-xl border border-transparent hover:border-red-500/20"
                            aria-label={`Remove ${res.name || 'resource'} endpoint`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 bg-black/20 rounded-2xl p-4 border border-zinc-800">
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 pb-2 border-b border-zinc-800 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          <div className="col-span-4">Field Name</div>
                          <div className="col-span-3">Type</div>
                          <div className="col-span-4">Mock Data</div>
                          <div className="col-span-1"></div>
                        </div>
                        
                        {res.fields.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="flex flex-col sm:grid sm:grid-cols-12 gap-3 items-start sm:items-center group bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-zinc-800 sm:border-transparent">
                            <div className="w-full sm:col-span-4">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block sm:hidden">Field Name</span>
                              <input
                                type="text"
                                value={field.name || ""}
                                onChange={(e) => updateField(resIndex, fieldIndex, "name", e.target.value)}
                                className="w-full bg-black/40 sm:bg-white/5 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-600 hover:bg-white/10 transition-all font-mono"
                                placeholder="field_name"
                              />
                            </div>
                            <div className="w-full sm:col-span-3 relative">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block sm:hidden">Type</span>
                              <select
                                value={field.type || "string"}
                                onChange={(e) => updateField(resIndex, fieldIndex, "type", e.target.value)}
                                className="w-full bg-white/5 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 hover:bg-white/10 transition-all appearance-none cursor-pointer font-medium"
                              >
                                <option value="string" className="bg-neutral-900 text-white">String</option>
                                <option value="number" className="bg-neutral-900 text-white">Number</option>
                                <option value="boolean" className="bg-neutral-900 text-white">Boolean</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                </svg>
                              </div>
                            </div>
                            <div className="w-full sm:col-span-4 relative">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1 block sm:hidden">Mock Data</span>
                              {field.type === 'boolean' ? (
                                <div className="w-full bg-white/5 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-neutral-500 font-medium cursor-not-allowed flex items-center justify-center">
                                  Random True/False
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={field.mockType || 'auto'}
                                    onChange={(e) => updateField(resIndex, fieldIndex, "mockType", e.target.value)}
                                    className="w-full bg-white/5 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-pink-200 focus:outline-none focus:ring-1 focus:ring-pink-500/50 hover:bg-white/10 transition-all appearance-none cursor-pointer font-medium"
                                  >
                                    <option value="auto" className="bg-neutral-900 text-white">Auto-detect</option>
                                    {field.type === 'number' ? (
                                      <optgroup label="Numeric" className="bg-neutral-900 text-white/50">
                                        <option value="price" className="bg-neutral-900 text-white">Price</option>
                                        <option value="age" className="bg-neutral-900 text-white">Age</option>
                                        <option value="amount" className="bg-neutral-900 text-white">Amount</option>
                                      </optgroup>
                                    ) : (
                                      <>
                                        <optgroup label="Identifiers" className="bg-neutral-900 text-white/50">
                                          <option value="uuid" className="bg-neutral-900 text-white">UUID</option>
                                          <option value="mongodb_id" className="bg-neutral-900 text-white">MongoDB ID</option>
                                        </optgroup>
                                        <optgroup label="People" className="bg-neutral-900 text-white/50">
                                          <option value="first_name" className="bg-neutral-900 text-white">First Name</option>
                                          <option value="last_name" className="bg-neutral-900 text-white">Last Name</option>
                                          <option value="full_name" className="bg-neutral-900 text-white">Full Name</option>
                                          <option value="email" className="bg-neutral-900 text-white">Email</option>
                                          <option value="password" className="bg-neutral-900 text-white">Password</option>
                                          <option value="avatar" className="bg-neutral-900 text-white">Avatar</option>
                                        </optgroup>
                                        <optgroup label="Content" className="bg-neutral-900 text-white/50">
                                          <option value="words" className="bg-neutral-900 text-white">Words</option>
                                          <option value="paragraph" className="bg-neutral-900 text-white">Paragraph</option>
                                          <option value="image_url" className="bg-neutral-900 text-white">Image URL</option>
                                          <option value="url" className="bg-neutral-900 text-white">URL</option>
                                        </optgroup>
                                        <optgroup label="Commerce" className="bg-neutral-900 text-white/50">
                                          <option value="product_name" className="bg-neutral-900 text-white">Product Name</option>
                                          <option value="company_name" className="bg-neutral-900 text-white">Company Name</option>
                                        </optgroup>
                                        <optgroup label="Location" className="bg-neutral-900 text-white/50">
                                          <option value="address" className="bg-neutral-900 text-white">Address</option>
                                          <option value="city" className="bg-neutral-900 text-white">City</option>
                                          <option value="country" className="bg-neutral-900 text-white">Country</option>
                                          <option value="phone" className="bg-neutral-900 text-white">Phone</option>
                                        </optgroup>
                                        <optgroup label="Time" className="bg-neutral-900 text-white/50">
                                          <option value="date_recent" className="bg-neutral-900 text-white">Recent Date</option>
                                          <option value="date_past" className="bg-neutral-900 text-white">Past Date</option>
                                        </optgroup>
                                      </>
                                    )}
                                  </select>
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="w-full sm:col-span-1 flex justify-end mt-2 sm:mt-0">
                              <button
                                onClick={() => removeField(resIndex, fieldIndex)}
                                className="text-neutral-600 hover:text-red-400 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg bg-red-500/5 sm:bg-transparent w-full sm:w-auto flex justify-center"
                                aria-label={`Remove field ${field.name}`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={() => addField(resIndex)}
                          className="mt-2 w-full py-3 text-sm text-neutral-400 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-xl flex items-center justify-center gap-2 transition-all border border-dashed border-zinc-800 hover:border-zinc-700"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add New Field
                        </button>
                      </div>
                    </div>
                        </SpotlightCard>
                      </motion.div>
                    </VirtualEndpoint>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Output Preview */}
          <motion.div className="xl:col-span-5 w-full flex flex-col space-y-6 xl:h-[calc(100vh-8rem)] xl:sticky xl:top-20">
            {!isFullscreen && renderCodePreview()}

            {/* <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-md shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-zinc-800/50 transition-all pointer-events-none"></div>
              <h3 className="text-zinc-300 text-sm font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                How to run your server
              </h3>
              <pre className="bg-black/60 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-neutral-300 overflow-x-auto shadow-inner leading-loose">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 opacity-50">$</span>
                  <span>npm init -y <span className="text-pink-400">&&</span> npm i express{config.cors ? ' cors' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 opacity-50">$</span>
                  <span>node server.js</span>
                </div>
              </pre>
            </div> */}
          </motion.div>
        </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
