import Skeleton from "../../components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 sm:p-8 md:p-12 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 opacity-50">
            Mock2Block
          </div>
          <Skeleton className="h-10 w-32" />
        </header>
        
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 mb-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-24 bg-white/10 rounded-md"></div>
                    <div className="h-4 w-16 bg-white/10 rounded-md"></div>
                  </div>
                  <div className="h-4 w-20 bg-white/10 rounded-md mb-2"></div>
                  <div className="flex gap-2 mb-6">
                    <div className="h-6 w-16 bg-white/10 rounded-md"></div>
                    <div className="h-6 w-20 bg-white/10 rounded-md"></div>
                  </div>
                </div>
                <div className="h-10 w-full bg-white/10 rounded-xl"></div>
              </Skeleton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
