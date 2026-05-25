"use client";

import { useRef, useState } from "react";
import { Document } from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  Paperclip, Upload, Trash2, FileText, FileSpreadsheet,
  File, Image, Download, Loader2,
} from "lucide-react";

interface DocumentsSectionProps {
  documents: Document[];
  packageId: string;
  userId: string;
  onAddDocument: (d: { name: string; size: string; type: string; storagePath: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  readonly?: boolean;
}

const iconForType = (type: string = "") => {
  const t = type || "";
  if (t.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (t.includes("sheet") || t.includes("excel") || t.includes("xlsx")) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  if (t.includes("image")) return <Image className="w-4 h-4 text-violet-600" />;
  if (t.includes("word") || t.includes("doc")) return <FileText className="w-4 h-4 text-blue-600" />;
  return <File className="w-4 h-4 text-slate-400" />;
};

export default function DocumentsSection({
  documents, packageId, userId, onAddDocument, onDeleteDocument, readonly,
}: DocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const humanSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const uploadFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setUploading(true);
    const supabase = createBrowserSupabase();
    try {
      for (const f of Array.from(files)) {
        // Storage path: {userId}/{packageId}/{uuid}_{filename}
        const safeFileName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${userId}/${packageId}/${crypto.randomUUID()}_${safeFileName}`;

        const { error: storageErr } = await supabase.storage
          .from("package-documents")
          .upload(storagePath, f, { cacheControl: "3600", upsert: false });

        if (storageErr) {
          setUploadError(`Upload failed: ${storageErr.message}`);
          continue;
        }

        await onAddDocument({
          name: f.name,
          size: humanSize(f.size),
          type: f.type || "application/octet-stream",
          storagePath,
        });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.storagePath) return;
    setDownloadingId(doc.id);
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.storage
        .from("package-documents")
        .createSignedUrl(doc.storagePath, 3600); // 1-hour signed URL
      if (error || !data?.signedUrl) {
        alert("Could not generate download link. Please try again.");
        return;
      }
      // Open in new tab — browser will decide to preview or download
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
        <Paperclip className="w-4 h-4 text-blue-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Documents</h3>
        <span className="text-xs text-slate-400 ml-1">({documents.length})</span>
      </div>

      {!readonly && (
        <div className="px-4 pt-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-200 rounded-lg py-5 flex flex-col items-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer"
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600 font-medium">Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Drag & drop or <span className="text-blue-600 font-medium">browse</span>
                </span>
                <span className="text-xs text-slate-400">PDF, Excel, Word, Images — up to 50 MB</span>
              </>
            )}
            <input ref={fileRef} type="file" multiple onChange={handleFiles} className="hidden" disabled={uploading} />
          </div>
          {uploadError && (
            <p className="mt-2 text-xs text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-400 text-sm italic">No documents attached.</div>
      ) : (
        <div className="divide-y divide-slate-100 mt-2">
          {documents.map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition group">
              {iconForType(doc.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{doc.size} • {doc.uploadedBy} • {formatDate(doc.uploadedAt)}</p>
              </div>

              {/* Download/View button — shown when there's a real file */}
              {doc.storagePath && (
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  title="View / Download"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  {downloadingId === doc.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                </button>
              )}

              {!readonly && (
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  title="Delete"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
