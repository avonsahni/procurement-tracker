// Instant skeleton shown while the Team Hub index loads.
export default function HubLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-pulse">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-4" />
        <div className="h-5 w-28 bg-slate-200 rounded mx-auto mb-3" />
        <div className="h-3 w-72 max-w-full bg-slate-100 rounded mx-auto" />
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3.5 bg-slate-200 rounded mb-1.5" style={{ width: `${45 - i * 5}%` }} />
              <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
