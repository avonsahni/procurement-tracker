// Instant skeleton shown while a filter view (mentions / open threads) loads.
export default function FilterLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-5 h-5 bg-slate-200 rounded" />
        <div className="h-5 w-36 bg-slate-200 rounded" />
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <div className="h-3.5 bg-slate-200 rounded mb-2" style={{ width: `${60 - i * 8}%` }} />
            <div className="h-2.5 w-44 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
