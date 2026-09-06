"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLoading from "../app/dashboard/loading";
import { motion } from "framer-motion";

export default function Dashboard({ initialUser = null }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
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
  }, [router]);

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 sm:p-8 md:p-12 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400">
            Mock2Block
          </Link>
          <Link href="/" className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all">
            Back to Builder
          </Link>
        </header>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-2">My Projects</h2>
          {projects.length === 0 ? (
            <div className="text-neutral-500">No projects deployed yet.</div>
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
                  className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all flex flex-col justify-between group"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">ID: {p.projectId}</span>
                      <span className="text-xs text-neutral-500">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm font-semibold text-white mb-2">Resources:</div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {p.resources.map(r => (
                        <span key={r.name} className="px-2 py-1 bg-black/40 text-neutral-300 text-xs rounded-md border border-white/5">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link 
                    href={`/projects/${p.projectId}`}
                    className="w-full text-center px-4 py-2.5 bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold rounded-xl border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all"
                  >
                    Open in Builder
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
