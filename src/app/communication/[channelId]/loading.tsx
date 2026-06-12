// Instant skeleton shown while a channel's thread list loads.
export default function ChannelLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      {/* Channel header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-5 w-44 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-64 bg-slate-100 rounded" />
        </div>
        <div className="h-8 w-28 bg-blue-100 rounded-lg shrink-0" />
      </div>

      {/* Thread cards */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${55 - i * 6}%` }} />
              <div className="h-4 w-14 bg-slate-100 rounded shrink-0" />
            </div>
            <div className="h-2.5 w-40 bg-slate-100 rounded mt-2.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
