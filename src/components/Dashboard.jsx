"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, MoreVertical, Trash2, CopyPlus, Download, CheckCircle2 } from "lucide-react";
import { exportToOpenAPI } from "../lib/exporters";

const getRelativeTime = (date) => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const timeMs = typeof date === 'number' ? date : new Date(date).getTime();
  const deltaDays = Math.round((timeMs - Date.now()) / (1000 * 3600 * 24));
  if (Math.abs(deltaDays) > 0) return rtf.format(deltaDays, 'day');
  const deltaHours = Math.round((timeMs - Date.now()) / (1000 * 3600));
  if (Math.abs(deltaHours) > 0) return rtf.format(deltaHours, 'hour');
  const deltaMinutes = Math.round((timeMs - Date.now()) / (1000 * 60));
  if (Math.abs(deltaMinutes) === 0) return 'just now';
  return rtf.format(deltaMinutes, 'minute');
};

export default function Dashboard({ initialUser = null }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [toast, setToast] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        } else {
          router.push("/");
        }
      } catch (e) {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
    
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [router]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const copyUrl = (e, projectId) => {
    e.stopPropagation();
    const url = `${window.location.origin}/projects/${projectId}/test/api`;
    navigator.clipboard.writeText(url);
    showToast("Copied API URL!");
  };

  const handleDuplicate = async (e, p) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: p.config, resources: p.resources, mockDb: p.mockDb, projectId: null })
      });
      if (res.ok) {
        const data = await res.json();
        setProjects([{ ...p, projectId: data.projectId, createdAt: Date.now() }, ...projects]);
        showToast("Project duplicated!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter(p => p.projectId !== projectId));
        showToast("Project deleted.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white font-sans p-4 sm:p-8 md:p-12 bg-transparent mt-6">
        <SkeletonTheme baseColor="#18181b" highlightColor="#27272a">
          <div className="max-w-[1400px] mx-auto space-y-8">
            <div className="space-y-6">
              <Skeleton height={40} width={200} className="mb-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between h-[200px]">
                    <div>
                      <div className="flex justify-between mb-4">
                        <Skeleton width={80} height={24} />
                        <Skeleton width={60} height={16} />
                      </div>
                      <Skeleton width={100} height={20} className="mb-2" />
                      <div className="flex gap-2 mb-6">
                        <Skeleton width={50} height={24} />
                        <Skeleton width={70} height={24} />
                      </div>
                    </div>
                    <Skeleton height={40} borderRadius={12} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SkeletonTheme>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans p-4 sm:p-8 md:p-12 selection:bg-zinc-800 bg-transparent">
      <div className="max-w-[1400px] mx-auto space-y-8 mt-6">
        <div className="space-y-6 relative">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">My Projects</h2>
            <AnimatePresence>
              {toast && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {projects.length === 0 ? (
            <div className="text-zinc-500">No projects deployed yet.</div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {projects.map(p => (
                <motion.div 
                  key={p.projectId} 
                  className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all flex flex-col justify-between group shadow-sm relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">ID: {p.projectId}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{getRelativeTime(p.createdAt || Date.now())}</span>
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === p.projectId ? null : p.projectId); }}
                            className="text-zinc-500 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 cursor-pointer" />
                          </button>
                          <AnimatePresence>
                            {openDropdownId === p.projectId && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-6 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                              >
                                <button onClick={(e) => handleDuplicate(e, p)} className="w-full text-left px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2">
                                  <CopyPlus className="w-3.5 h-3.5" /> Duplicate
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); exportToOpenAPI(p.config, p.resources); }} className="w-full text-left px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2">
                                  <Download className="w-3.5 h-3.5" /> Export OpenAPI
                                </button>
                                <div className="h-px w-full bg-zinc-800/50"></div>
                                <button onClick={(e) => handleDelete(e, p.projectId)} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-zinc-300 mb-2">Resources:</div>
                    <div className="flex flex-wrap gap-2 mb-6 relative z-0">
                      {p.resources.map(r => (
                        <span key={r.name} className="px-2.5 py-1 bg-zinc-800/50 text-zinc-300 text-xs rounded-md border border-zinc-700 truncate max-w-[150px]">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 relative z-0">
                    <button 
                      onClick={(e) => copyUrl(e, p.projectId)}
                      className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium rounded-xl border border-zinc-700 transition-colors flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <Link 
                      href={`/projects/${p.projectId}`}
                      className="flex-1 text-center px-4 py-2.5 bg-white text-black hover:bg-zinc-200 text-sm font-semibold rounded-xl transition-colors"
                    >
                      Open Builder
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
