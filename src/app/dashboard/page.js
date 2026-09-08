import Dashboard from "../../components/Dashboard";
import { cookies } from "next/headers";
import { verifyToken } from "../../lib/auth";
import { kv } from "@vercel/kv";
import { Suspense } from "react";

function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-[1400px] mx-auto space-y-12">
        <header className="space-y-4">
          <div className="h-10 w-48 bg-zinc-800 rounded-lg animate-pulse"></div>
          <div className="h-6 w-96 bg-zinc-800/50 rounded-lg animate-pulse"></div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 h-48 animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function DashboardData() {
  let initialUser = null;
  let initialProjects = [];
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        initialUser = decoded.username || null;
        
        // Fetch projects on the server
        const projectIds = await kv.smembers(`user:${initialUser}:projects`);
        if (projectIds && projectIds.length > 0) {
          const projectPromises = projectIds.map(async (id) => {
            const data = await kv.get(`project:${id}`);
            return { projectId: id, ...data };
          });
          const resolvedProjects = await Promise.all(projectPromises);
          const validProjects = resolvedProjects.filter(p => p && p.config && p.resources);
          validProjects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          initialProjects = validProjects;
        }
      }
    }
  } catch (e) {
    // Silent fail
  }

  return <Dashboard initialUser={initialUser} initialProjects={initialProjects} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
