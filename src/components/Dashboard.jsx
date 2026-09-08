"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
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
        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold text-zinc-100 mb-2 tracking-tight">My Projects</h2>
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
                  className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all flex flex-col justify-between group shadow-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">ID: {p.projectId}</span>
                      <span className="text-xs text-zinc-500">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-300 mb-2">Resources:</div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {p.resources.map(r => (
                        <span key={r.name} className="px-2.5 py-1 bg-zinc-800/50 text-zinc-300 text-xs rounded-md border border-zinc-700">
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link 
                    href={`/projects/${p.projectId}`}
                    className="w-full text-center px-4 py-2.5 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-sm font-medium rounded-xl border border-zinc-700 transition-colors"
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
