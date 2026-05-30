"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Loader2, Camera, X, ImageIcon } from "lucide-react";
import { Remark } from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase/client";

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

interface ProgressRemarksPanelProps {
  remarks: Remark[];
  packageId: string;
  orgId?: string;
  readonly?: boolean;
  onAddRemark: (text: string, imageUrl?: string) => Promise<void>;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

/** Lazily loads a signed URL and renders a thumbnail for a storage path. */
function RemarkImage({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.storage
      .from("package-documents")
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setErr(true); return; }
        setUrl(data.signedUrl);
      });
  }, [storagePath]);

  if (err) return <span className="text-xs text-slate-400 italic">unavailable</span>;
  if (!url) return <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="View full image">
      <img
        src={url}
        alt="Remark photo"
        className="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition shadow-sm"
      />
    </a>
  );
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

  // Image attachment state
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ blob: Blob; name: string; size: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const sorted = [...remarks].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setUploadErr("Only image files are accepted.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadErr("Image must be under 10 MB.");
      return;
    }
    setUploadErr(null);
    setConverting(true);
    try {
      const webpBlob = await convertToWebP(f);
      const baseName = f.name.replace(/\.[^.]+$/, "");
      setPendingFile({ blob: webpBlob, name: baseName, size: webpBlob.size });
      setPreviewUrl(URL.createObjectURL(webpBlob));
    } catch {
      setUploadErr("Image conversion failed. Please try a different file.");
    } finally {
      setConverting(false);
    }
  };

  const clearImage = () => {
    setPendingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setUploadErr(null);
    try {
      let storagePath: string | undefined;

      if (pendingFile) {
        const supabase = createBrowserSupabase();
        const safeBaseName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const prefix = orgId || "shared";
        storagePath = `${prefix}/${packageId}/remarks/${crypto.randomUUID()}_${safeBaseName}.webp`;

        const { error: storageErr } = await supabase.storage
          .from("package-documents")
          .upload(storagePath, pendingFile.blob, {
            contentType: "image/webp",
            cacheControl: "3600",
            upsert: false,
          });

        if (storageErr) {
          setUploadErr(`Image upload failed: ${storageErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      await onAddRemark(text.trim(), storagePath);
      setText("");
      clearImage();
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Update progress remarks…"
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={submitting}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400 disabled:opacity-60"
            />
            {/* Camera button */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={submitting || converting}
              title="Attach photo"
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-400 transition disabled:opacity-50"
            >
              {converting
                ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {submitting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {/* Image preview */}
          {previewUrl && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="relative w-16 h-16 flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg border border-blue-200 shadow-sm"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">{pendingFile?.name}.webp</span>
                <span className="text-[11px] text-emerald-600 font-medium">{pendingFile ? humanSize(pendingFile.size) : ""} · WebP</span>
              </div>
            </div>
          )}

          {uploadErr && (
            <p className="mt-1.5 text-xs text-red-600">{uploadErr}</p>
          )}
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap w-24">Photo</th>
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
                    {r.imageUrl ? (
                      <RemarkImage storagePath={r.imageUrl} />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-200" />
                    )}
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
