import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 sm:p-8 md:p-12 selection:bg-zinc-800">
      <SkeletonTheme baseColor="#18181b" highlightColor="#27272a">
        <div className="max-w-[1400px] mx-auto space-y-12 mt-6">
          
          {/* Header Skeleton */}
          <header className="space-y-4">
            <Skeleton height={48} width={250} />
            <Skeleton height={24} width="100%" style={{ maxWidth: '600px' }} />
          </header>

          {/* Live Banner Skeleton */}
          <Skeleton height={80} width="100%" borderRadius={16} />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Spec Builder */}
            <div className="xl:col-span-7 space-y-8">
              {/* Global Settings */}
              <Skeleton height={128} borderRadius={24} />
              
              {/* Presets and Deploy */}
              <Skeleton height={64} borderRadius={16} />
              
              {/* AI Generation */}
              <Skeleton height={96} borderRadius={24} />
              
              {/* Resources Header */}
              <div className="flex items-center justify-between px-2">
                <Skeleton height={32} width={160} />
                <Skeleton height={40} width={128} />
              </div>

              {/* API Resource Blocks */}
              <div className="grid grid-cols-1 gap-6">
                <Skeleton height={192} borderRadius={24} />
                <Skeleton height={192} borderRadius={24} />
              </div>
            </div>

            {/* Right Column: Output Preview */}
            <div className="xl:col-span-5 h-[calc(100vh-8rem)] sticky top-8 flex flex-col space-y-6">
              <Skeleton height="100%" borderRadius={24} />
            </div>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
}
