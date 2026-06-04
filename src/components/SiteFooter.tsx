import { LogoFull } from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <a href="/" aria-label="ProcureTrack home" className="hover:opacity-80 transition">
          <LogoFull height={24} />
        </a>
        <p className="text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} ProcureTrack · All rights reserved
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <a href="/terms"   className="hover:text-slate-600 transition">Terms</a>
          <a href="/privacy" className="hover:text-slate-600 transition">Privacy</a>
          <a href="mailto:admin@procuretrack.in" className="hover:text-slate-600 transition">Contact</a>
        </div>
      </div>
    </footer>
  );
}
