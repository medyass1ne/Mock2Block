import Skeleton from "../../../components/Skeleton";

export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 sm:p-8 md:p-12 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-12">
        
        {/* Header Skeleton */}
        <header className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-full max-w-2xl" />
        </header>

        {/* Live Banner Skeleton */}
        <Skeleton className="h-20 w-full rounded-2xl" />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Spec Builder */}
          <div className="xl:col-span-7 space-y-8">
            {/* Global Settings */}
            <Skeleton className="h-32 w-full rounded-3xl" />
            
            {/* Presets and Deploy */}
            <Skeleton className="h-16 w-full rounded-2xl" />
            
            {/* AI Generation */}
            <Skeleton className="h-24 w-full rounded-3xl" />
            
            {/* Resources Header */}
            <div className="flex items-center justify-between px-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>

            {/* API Resource Blocks */}
            <div className="grid grid-cols-1 gap-6">
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-48 w-full rounded-3xl" />
            </div>
          </div>

          {/* Right Column: Output Preview */}
          <div className="xl:col-span-5 h-[calc(100vh-8rem)] sticky top-8 flex flex-col space-y-6">
            <Skeleton className="h-[600px] w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
