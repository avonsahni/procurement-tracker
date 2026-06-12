// Instant skeleton shown while the thread (messages + members) loads.
// Mirrors the thread page structure: header bar, message bubbles, compose row.
export default function ThreadLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-pulse" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Thread header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 bg-slate-200 rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-2.5 w-20 bg-slate-100 rounded mb-1.5" />
            <div className="h-3.5 w-56 max-w-full bg-slate-200 rounded" />
          </div>
        </div>
      </div>

      {/* Message bubbles */}
      <div className="flex-1 px-6 py-5 space-y-4 overflow-hidden">
        {[
          { mine: false, w: "w-52" },
          { mine: false, w: "w-72" },
          { mine: true,  w: "w-60" },
          { mine: false, w: "w-44" },
          { mine: true,  w: "w-80" },
        ].map((b, i) => (
          <div key={i} className={`flex ${b.mine ? "justify-end" : "justify-start"}`}>
            <div className={`${b.w} max-w-[75%]`}>
              {!b.mine && <div className="h-2.5 w-16 bg-slate-100 rounded mb-1.5" />}
              <div
                className={`h-10 rounded-2xl ${
                  b.mine ? "bg-blue-100" : "bg-slate-200/70"
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Compose row */}
      <div className="border-t border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
          <div className="h-10 w-10 bg-blue-100 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}
