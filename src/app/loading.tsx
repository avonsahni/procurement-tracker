// Root loading boundary — gives instant feedback on navigations that re-render
// a section layout (e.g. Dashboard → Team Hub), which segment-level loading
// files cannot cover. Matches the in-app spinner style.
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}
