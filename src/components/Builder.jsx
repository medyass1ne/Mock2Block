"use client";

import { useState, useEffect, useRef } from "react";
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
import Skeleton from "./Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import * as pdfjsLib from 'pdfjs-dist';
import { exportToOpenAPI, exportToPostman } from "../lib/exporters";
import DotField from "./DotField";

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function Builder({ initialData = null, projectId = null, initialUser = null }) {
  const router = useRouter();
  const [config, setConfig] = useState(initialData?.config || { port: 5000, cors: true, delay: 0 });
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
  const [user, setUser] = useState(initialUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authReason, setAuthReason] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authNeedsVerification, setAuthNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [projects, setProjects] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [verifiedAlert, setVerifiedAlert] = useState(null);
  const fileInputRef = useRef(null);

  const searchParams = useSearchParams();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);

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

  const initializeDb = () => {
    const newDb = {};
    resources.forEach(res => {
      newDb[res.name] = seedResource(res.name, res.fields, 3);
    });
    setMockDb(newDb);
  };

  useEffect(() => {
    initializeDb();
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
    setGeneratedCode(generateExpress(config, resources, mockDb));
  }, [config, resources, mockDb]);

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
      { name: "new_resource", fields: [{ name: "field_name", type: "string" }] },
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    setAuthNeedsVerification(false);
    try {
      const payload = { username: authUsername, password: authPassword };
      if (authMode === 'register') payload.email = authEmail;

      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.needsVerification) {
          // Registration succeeded but needs email verification
          setAuthSuccess(data.message || "Check your email to verify your account.");
          setAuthMode('login');
          setAuthPassword("");
          setAuthEmail("");
        } else {
          setUser(data.username);
          setShowAuthModal(false);
          setAuthUsername("");
          setAuthPassword("");
          setAuthEmail("");
          setAuthSuccess("");
          fetchProjects();
          if (authReason === "login" && !projectId) {
            router.push("/dashboard");
          }
        }
      } else {
        setAuthError(data.error || "Authentication failed");
        if (data.needsVerification) setAuthNeedsVerification(true);
      }
    } catch (e) {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: "POST" });
    setUser(null);
    setProjects([]);
    if (activeTab === 'dashboard') setActiveTab('code');
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

  const renderCodePreview = (isOverlay = false) => (
    <div className={`flex-1 bg-[#09090b] border border-white/10 ${isOverlay ? 'rounded-2xl h-full' : 'rounded-3xl'} overflow-hidden shadow-2xl flex flex-col relative group transition-all duration-300`}>
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
      
      <div className="bg-white/[0.02] px-5 py-4 border-b border-white/5 flex items-center justify-between backdrop-blur-xl relative z-20">
        <div className="flex items-center gap-2">
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 ml-2">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider ${activeTab === 'code' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm border border-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              server.js
            </button>
            <button
              onClick={() => setActiveTab("docs")}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'docs' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/20' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              API Docs
            </button>
            <button
              onClick={() => setActiveTab("tester")}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'tester' ? 'bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/20' : 'text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              API Tester
            </button>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <div onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="cursor-pointer">
              <SpecularButton size="sm" className="!py-1.5 !px-3 !rounded-lg text-xs" autoAnimate>
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </span>
              </SpecularButton>
            </div>
            
            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-[#0c1017]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 z-50">
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
                    <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download API Docs (.md)
                  </button>
                  <button 
                    onClick={() => { setShowDownloadMenu(false); exportToOpenAPI(config, resources); }}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Export OpenAPI 3.0 (JSON)
                  </button>
                  <button 
                    onClick={() => { setShowDownloadMenu(false); exportToPostman(config, resources); }}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 hover:text-white rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Export Postman Collection
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div onClick={copyToClipboard} className="cursor-pointer">
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
          <div onClick={() => setIsFullscreen(!isFullscreen)} className="cursor-pointer">
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
      </div>
      
      <div className="p-6 overflow-auto flex-1 custom-scrollbar relative z-10 text-sm">
        {activeTab === 'code' && (
          <motion.div layout>
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
      </div>
    </div>
  );

  return (
    <>
      {/* Verified Banner Alert */}
      <AnimatePresence>
        {verifiedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] w-full max-w-lg px-4"
          >
            <div className="bg-emerald-950/90 border border-emerald-500/30 backdrop-blur-xl text-emerald-200 px-5 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{verifiedAlert.title || (verifiedAlert.type === 'info' ? 'Notice' : 'Success!')}</h4>
                  <p className="text-xs text-emerald-200/90">{verifiedAlert.message}</p>
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
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow-md flex-shrink-0"
                  >
                    Sign In
                  </button>
                )}
                <button
                  onClick={() => setVerifiedAlert(null)}
                  className="p-1 text-emerald-400 hover:text-white transition-colors"
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

      {/* Auth Modal & Sign In Button */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
        {user ? (
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl shadow-lg">
            <span className="text-sm text-neutral-300 font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {user}
            </span>
            <div className="w-px h-4 bg-white/10"></div>
            <Link href="/dashboard" className="text-neutral-400 hover:text-amber-400 text-xs font-semibold transition-colors uppercase tracking-wider">Dashboard</Link>
            <div className="w-px h-4 bg-white/10"></div>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-red-400 text-xs font-semibold transition-colors uppercase tracking-wider">Logout</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-lg">
            <button onClick={() => { setAuthReason("login"); setShowAuthModal(true); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] uppercase tracking-wider">Sign In</button>
          </div>
        )}
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 relative z-10">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6 relative z-10">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Login</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Register</button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
                <input type="text" required value={authUsername} onChange={e => setAuthUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder-neutral-600" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
              </div>
              {authSuccess && <div className="text-green-400 text-xs font-medium bg-green-500/10 p-3 rounded-lg border border-green-500/20 flex items-center gap-2"><svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{authSuccess}</div>}
              {authError && (
                <div className="text-red-400 text-xs font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <p>{authError}</p>
                  {authNeedsVerification && (
                    <button
                      type="button"
                      disabled={resending}
                      onClick={async () => {
                        setResending(true);
                        try {
                          const res = await fetch('/api/auth/resend', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: authUsername })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setAuthError('');
                            setAuthNeedsVerification(false);
                            setAuthSuccess(data.message || 'Verification email resent!');
                          } else {
                            setAuthError(data.error || 'Failed to resend');
                          }
                        } catch (e) {
                          setAuthError('Network error while resending');
                        } finally {
                          setResending(false);
                        }
                      }}
                      className="mt-2 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-red-500/20 hover:border-red-500/40 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {resending ? 'Sending...' : 'Resend Confirmation Email'}
                    </button>
                  )}
                </div>
              )}
              <button type="submit" disabled={authLoading} className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50">
                {authLoading ? '...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPublishModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <button onClick={() => setShowPublishModal(false)} className="absolute top-5 right-5 text-neutral-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 relative z-10 flex items-center gap-2">
              🌎 Publish Preset
            </h2>
            <form onSubmit={handlePublishPreset} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Preset Title</label>
                <input type="text" required value={publishTitle} onChange={e => setPublishTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" placeholder="e.g. E-Commerce Storefront" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Description (Optional)</label>
                <textarea rows={3} value={publishDesc} onChange={e => setPublishDesc(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all" placeholder="A brief description of this API schema..." />
              </div>
              <button type="submit" disabled={publishLoading} className="w-full py-3 mt-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] disabled:opacity-50">
                {publishLoading ? 'Publishing...' : 'Publish to Community'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="fixed inset-0 z-[100] p-4 sm:p-8 bg-black/90 backdrop-blur-md flex flex-col">
          {renderCodePreview(true)}
        </div>
      )}
      <div className="relative min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none mix-blend-screen">
          <DotField
            dotRadius={1.5}
            dotSpacing={14}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={true}
            waveAmplitude={0}
          />
        </div>
        <div className="relative z-10 p-4 sm:p-8 md:p-12">
          <div className="max-w-[1400px] mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient-x">
            Mock2Block
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl leading-relaxed">
            Instantly generate a single, runnable Express.js server with full in-memory CRUD operations. Design your API structure visually.
          </p>
        </header>

        {deployUrl && (
          <div className="z-10 relative animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(99,102,241,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/20">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Deployed Successfully!</h3>
                  <p className="text-indigo-200/70 text-sm mt-0.5">Your API is live and ready to consume from your frontend app.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-1.5 w-full sm:w-auto relative z-10 shadow-inner">
                <input type="text" readOnly value={deployUrl} className="bg-transparent text-sm font-mono text-indigo-300 px-3 py-1.5 focus:outline-none w-full sm:w-80 truncate" />
                <button 
                  onClick={() => navigator.clipboard.writeText(deployUrl)}
                  className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-semibold rounded-md transition-colors whitespace-nowrap border border-indigo-500/20 hover:text-white"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        )}

        <motion.div 
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Left Column: Spec Builder */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Global Settings */}
            <section className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.04]">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Global Settings
                </h2>
                {!projectId && (
                  <div onClick={handleDeploy} className={`cursor-pointer ${isDeploying ? 'opacity-50 pointer-events-none' : ''}`}>
                    <SpecularButton size="sm" baseColor="#4f46e5" className="text-sm rounded-xl !bg-indigo-600/20 !border-indigo-500/30 hover:!bg-indigo-600/30" autoAnimate>
                      {isDeploying ? "Deploying..." : "☁️ Deploy to Cloud"}
                    </SpecularButton>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-400">Port Number</label>
                  <input
                    type="number"
                    name="port"
                    value={config.port}
                    onChange={handleConfigChange}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20 transition-all shadow-inner font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-400">Simulated Delay (ms)</label>
                  <input
                    type="number"
                    name="delay"
                    value={config.delay}
                    onChange={handleConfigChange}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:border-white/20 transition-all shadow-inner font-mono"
                  />
                </div>
                <div className="flex items-center sm:items-end pb-2">
                  <label className="flex items-center cursor-pointer group w-full justify-between sm:justify-start gap-4">
                    <span className="text-sm font-medium text-neutral-400">Enable CORS</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="cors"
                        checked={config.cors}
                        onChange={handleConfigChange}
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-all duration-300 ${config.cors ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-black/50 border border-white/10 group-hover:border-white/20'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-sm ${config.cors ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Presets */}
            <section className="flex flex-col flex-wrap justify-between gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
              <div className="flex flex-wrap items-center justify-between width-[100% gap-3 ml-auto">
                <Link href="/discover" className="cursor-pointer block">
                  <SpecularButton size="sm" baseColor="#e11d48" className="text-sm whitespace-nowrap rounded-xl !bg-rose-600/20 !border-rose-500/30 hover:!bg-rose-600/30 text-rose-300" autoAnimate>
                    🔍 Discover Presets
                  </SpecularButton>
                </Link>
                {user && (
                  <div onClick={() => setShowPublishModal(true)} className="cursor-pointer">
                    <SpecularButton size="sm" baseColor="#0891b2" className="text-sm whitespace-nowrap rounded-xl !bg-cyan-600/20 !border-cyan-500/30 hover:!bg-cyan-600/30 text-cyan-300" autoAnimate>
                      🌎 Publish as Preset
                    </SpecularButton>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-neutral-400 px-2 whitespace-nowrap">Quick Presets:</span>
                <div className="flex flex-wrap gap-3">
                  <div onClick={() => loadPreset("todos")} className="cursor-pointer">
                    <SpecularButton size="sm" className="text-sm whitespace-nowrap rounded-xl" autoAnimate>
                      Load Todo App
                    </SpecularButton>
                  </div>
                  <div onClick={() => loadPreset("ecommerce")} className="cursor-pointer">
                    <SpecularButton size="sm" className="text-sm whitespace-nowrap rounded-xl" autoAnimate>
                      Load E-commerce
                    </SpecularButton>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Generation */}
            <section className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-3xl p-6 sm:p-8 relative overflow-hidden group transition-all duration-500 hover:bg-white/[0.04]">
              <div className="absolute -top-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none"></div>
              
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/20">
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
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:border-white/20 transition-all shadow-inner placeholder-neutral-500"
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
                      className="px-4 py-3 rounded-xl font-medium transition-all shadow-lg border whitespace-nowrap bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
                          ? 'bg-purple-500/10 text-purple-200/40 border-purple-500/10 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                      }`}
                    >
                      {isGenerating ? "Generating..." : (!user ? "Sign in to generate" : "✨ Generate API")}
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
                      className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5 w-fit"
                    >
                      <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-purple-200 font-medium truncate max-w-[200px]">{uploadedFile.name}</span>
                      <span className="text-xs text-purple-400/60">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-purple-400/60 hover:text-purple-300 transition-colors ml-1 p-0.5 hover:bg-purple-500/10 rounded-md"
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
                  <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 border border-cyan-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </div>
                  API Resources
                </h2>
                <button
                  onClick={addResource}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl text-sm font-medium transition-all duration-300 border border-indigo-500/20 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Endpoint
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {isGenerating ? (
                  <>
                    <Skeleton className="h-20 w-full mb-4" />
                    <Skeleton className="h-20 w-full mb-4" />
                    <Skeleton className="h-20 w-full mb-4" />
                  </>
                ) : (
                  resources.map((res, resIndex) => (
                    <motion.div 
                      key={res.id || `resource-${resIndex}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SpotlightCard className="rounded-3xl border border-white/5 bg-white/[0.02] shadow-xl" spotlightColor="rgba(99, 102, 241, 0.1)">
                        <div className="p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3 w-full sm:max-w-sm">
                          <span className="text-neutral-500 font-mono text-lg bg-black/40 px-4 py-2 rounded-l-xl border border-r-0 border-white/10">
                            /api/
                          </span>
                          <input
                            type="text"
                            value={res.name}
                            onChange={(e) => updateResourceName(resIndex, e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-r-xl px-4 py-2 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono shadow-inner -ml-3"
                            placeholder="resource_name"
                          />
                        </div>
                        <button
                          onClick={() => removeResource(resIndex)}
                          className="text-neutral-500 hover:text-red-400 bg-red-500/0 hover:bg-red-500/10 transition-all p-2.5 rounded-xl border border-transparent hover:border-red-500/20 self-end sm:self-auto"
                          title="Remove Resource"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="space-y-3 bg-black/20 rounded-2xl p-4 border border-white/5">
                        <div className="grid grid-cols-12 gap-3 px-3 pb-2 border-b border-white/5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                          <div className="col-span-4">Field Name</div>
                          <div className="col-span-3">Type</div>
                          <div className="col-span-4">Mock Data</div>
                          <div className="col-span-1"></div>
                        </div>
                        
                        {res.fields.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="grid grid-cols-12 gap-3 items-center group">
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => updateField(resIndex, fieldIndex, "name", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-white/10 transition-all font-mono"
                                placeholder="field_name"
                              />
                            </div>
                            <div className="col-span-3 relative">
                              <select
                                value={field.type}
                                onChange={(e) => updateField(resIndex, fieldIndex, "type", e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-white/10 transition-all appearance-none cursor-pointer font-medium"
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
                            <div className="col-span-4 relative">
                              {field.type === 'boolean' ? (
                                <div className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-neutral-500 font-medium cursor-not-allowed flex items-center justify-center">
                                  Random True/False
                                </div>
                              ) : (
                                <>
                                  <select
                                    value={field.mockType || 'auto'}
                                    onChange={(e) => updateField(resIndex, fieldIndex, "mockType", e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-pink-200 focus:outline-none focus:ring-1 focus:ring-pink-500/50 hover:bg-white/10 transition-all appearance-none cursor-pointer font-medium"
                                  >
                                    <option value="auto" className="bg-neutral-900 text-white">✨ Auto-detect</option>
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
                            <div className="col-span-1 flex justify-end">
                              <button
                                onClick={() => removeField(resIndex, fieldIndex)}
                                className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"
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
                          className="mt-2 w-full py-3 text-sm text-neutral-400 hover:text-indigo-300 hover:bg-indigo-500/5 rounded-xl flex items-center justify-center gap-2 transition-all border border-dashed border-white/10 hover:border-indigo-500/30"
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
                )))}
              </div>
            </section>
          </div>

          {/* Right Column: Output Preview */}
          <motion.div className="xl:col-span-5 h-[calc(100vh-8rem)] sticky top-8 flex flex-col space-y-6">
            {!isFullscreen && renderCodePreview()}

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none"></div>
              <h3 className="text-cyan-400 text-sm font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                How to run your server
              </h3>
              <pre className="bg-black/60 border border-white/5 rounded-xl p-4 text-sm font-mono text-neutral-300 overflow-x-auto shadow-inner leading-loose">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-500 opacity-50">$</span>
                  <span>npm init -y <span className="text-pink-400">&&</span> npm i express{config.cors ? ' cors' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-cyan-500 opacity-50">$</span>
                  <span>node server.js</span>
                </div>
              </pre>
            </div>
          </motion.div>
        </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
