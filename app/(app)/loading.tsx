export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-48 bg-sand/50 rounded-lg" />
        <div className="h-4 w-64 bg-sand/30 rounded-lg mt-2" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-sand p-5 space-y-3"
          >
            <div className="w-10 h-10 bg-sand/30 rounded-xl" />
            <div className="h-6 w-16 bg-sand/50 rounded-lg" />
            <div className="h-3 w-24 bg-sand/30 rounded" />
            <div className="h-2 w-20 bg-sand/20 rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sand">
          <div className="p-5 border-b border-sand">
            <div className="h-5 w-40 bg-sand/50 rounded-lg" />
          </div>
          <div className="divide-y divide-sand/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-16 h-4 bg-sand/30 rounded" />
                <div className="w-1.5 h-8 bg-sand/30 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-sand/40 rounded" />
                  <div className="h-3 w-60 bg-sand/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-sand p-5 space-y-3"
            >
              <div className="h-4 w-32 bg-sand/40 rounded" />
              <div className="h-3 w-full bg-sand/20 rounded" />
              <div className="h-3 w-3/4 bg-sand/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
