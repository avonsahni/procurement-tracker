"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, Camera, X, ImageIcon } from "lucide-react";
import { Remark } from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase/client";

const MAX_PHOTOS = 10;

/** Convert any image File to a WebP Blob, capped at maxPx on the longest side. */
function convertToWebP(file: File, maxPx = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Conversion failed")),
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Image load failed")); };
    img.src = objUrl;
  });
}

const humanSize = (b: number) =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

type PendingPhoto = { blob: Blob; name: string; size: number; previewUrl: string };

/** Lazily loads a signed URL for one storage path and renders a thumbnail. */
function RemarkThumb({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    createBrowserSupabase()
      .storage.from("package-documents")
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setErr(true); return; }
        setUrl(data.signedUrl);
      });
  }, [storagePath]);

  if (err) return <span className="text-[10px] text-slate-400 italic">n/a</span>;
  if (!url) return <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="View full image">
      <img
        src={url}
        alt="Remark photo"
        className="w-12 h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition shadow-sm"
      />
    </a>
  );
}

/** Renders up to 3 thumbnails with a "+N" overflow badge. */
function RemarkImages({ paths }: { paths: string[] }) {
  const visible = paths.slice(0, 3);
  const overflow = paths.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visible.map(p => <RemarkThumb key={p} storagePath={p} />)}
      {overflow > 0 && (
        <span className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500">
          +{overflow}
        </span>
      )}
    </div>
  );
}

interface ProgressRemarksPanelProps {
  remarks: Remark[];
  packageId: string;
  orgId?: string;
  readonly?: boolean;
  onAddRemark: (text: string, imageUrls?: string[], imageBytes?: number) => Promise<void>;
}

export default function ProgressRemarksPanel({
  remarks,
  packageId,
  orgId,
  readonly,
  onAddRemark,
}: ProgressRemarksPanelProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const sorted = [...remarks].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selected.length) return;

    const nonImages = selected.filter(f => !f.type.startsWith("image/"));
    if (nonImages.length) { setUploadErr("Only image files are accepted."); return; }

    const oversized = selected.find(f => f.size > 10 * 1024 * 1024);
    if (oversized) { setUploadErr(`"${oversized.name}" exceeds the 10 MB limit.`); return; }

    const slots = MAX_PHOTOS - pendingPhotos.length;
    if (selected.length > slots) {
      setUploadErr(
        slots === 0
          ? `Maximum ${MAX_PHOTOS} photos per remark already selected.`
          : `You can add ${slots} more photo${slots === 1 ? "" : "s"} (${MAX_PHOTOS} max).`
      );
      return;
    }

    setUploadErr(null);
    setConverting(true);
    try {
      const converted = await Promise.all(
        selected.map(async f => {
          const blob = await convertToWebP(f);
          return { blob, name: f.name.replace(/\.[^.]+$/, ""), size: blob.size, previewUrl: URL.createObjectURL(blob) };
        })
      );
      setPendingPhotos(prev => [...prev, ...converted]);
    } catch {
      setUploadErr("Conversion failed for one or more images. Please try again.");
    } finally {
      setConverting(false);
    }
  };

  const removePhoto = (idx: number) => {
    setPendingPhotos(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearPhotos = () => {
    pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPendingPhotos([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setUploadErr(null);
    try {
      let imageUrls: string[] | undefined;

      if (pendingPhotos.length > 0) {
        const supabase = createBrowserSupabase();
        const prefix = orgId || "shared";
        const results = await Promise.all(
          pendingPhotos.map(async ph => {
            const safeBase = ph.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `${prefix}/${packageId}/remarks/${crypto.randomUUID()}_${safeBase}.webp`;
            const { error } = await supabase.storage
              .from("package-documents")
              .upload(path, ph.blob, { contentType: "image/webp", cacheControl: "3600", upsert: false });
            if (error) throw new Error(`Upload failed: ${error.message}`);
            return path;
          })
        );
        imageUrls = results;
      }

      await onAddRemark(text.trim(), imageUrls, imageUrls ? totalSize : undefined);
      setText("");
      clearPhotos();
    } catch (err: any) {
      setUploadErr(err?.message ?? "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalSize = pendingPhotos.reduce((s, p) => s + p.size, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Progress Remarks</h3>
        <span className="text-xs text-slate-400 ml-1">({remarks.length})</span>
      </div>

      {/* Add remark form */}
      {!readonly && (
        <form onSubmit={handleSubmit} className="px-5 py-3.5 border-b border-slate-100 bg-blue-50/40">
          {/* Text + controls row */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Update progress remarks…"
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={submitting}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400 disabled:opacity-60"
            />

            {/* Camera button with count badge */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={submitting || converting || pendingPhotos.length >= MAX_PHOTOS}
                title={pendingPhotos.length >= MAX_PHOTOS ? `Max ${MAX_PHOTOS} photos` : `Attach photos (up to ${MAX_PHOTOS})`}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-400 transition disabled:opacity-40"
              >
                {converting
                  ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  : <Camera className="w-4 h-4" />}
              </button>
              {pendingPhotos.length > 0 && !converting && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none">
                  {pendingPhotos.length}
                </span>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 flex-shrink-0"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {/* Photo preview grid */}
          {pendingPhotos.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-500">
                  {pendingPhotos.length}/{MAX_PHOTOS} photos &middot; {humanSize(totalSize)} total &middot; <span className="text-emerald-600 font-medium">WebP</span>
                </span>
                <button type="button" onClick={clearPhotos} className="text-[11px] text-red-500 hover:text-red-600 transition">
                  Remove all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingPhotos.map((ph, idx) => (
                  <div key={idx} className="relative group w-16 h-16 flex-shrink-0">
                    <img
                      src={ph.previewUrl}
                      alt={ph.name}
                      className="w-full h-full object-cover rounded-lg border border-blue-200 shadow-sm"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] text-white font-semibold bg-black/40 rounded-b-lg px-0.5 leading-[14px]">
                      {humanSize(ph.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center hover:bg-red-600 transition"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {/* Add more slot */}
                {pendingPhotos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={converting}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition flex-shrink-0 disabled:opacity-40"
                  >
                    {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {uploadErr && <p className="mt-2 text-xs text-red-600">{uploadErr}</p>}
        </form>
      )}

      {/* Remarks table */}
      {sorted.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-10 italic">
          No progress remarks yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-44">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-36">User</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remark</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-44">Photos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap align-top">
                    {fmtDate(r.timestamp)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-xs font-semibold text-blue-700">{r.user}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 leading-relaxed align-top">
                    {r.text}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {r.imageUrls && r.imageUrls.length > 0
                      ? <RemarkImages paths={r.imageUrls} />
                      : <ImageIcon className="w-4 h-4 text-slate-200" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
