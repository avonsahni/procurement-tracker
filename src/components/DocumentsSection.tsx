"use client";

import { useRef, useState } from "react";
import { Document } from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  Paperclip, Upload, Trash2, FileText,
  Download, Loader2,
} from "lucide-react";

interface DocumentsSectionProps {
  documents: Document[];
  packageId: string;
  userId: string;
  orgId?: string;
  onAddDocument: (d: { name: string; size: string; sizeBytes: number; type: string; storagePath: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  readonly?: boolean;
}

export default function DocumentsSection({
  documents, packageId, userId, orgId, onAddDocument, onDeleteDocument, readonly,
}: DocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const humanSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per file

  const uploadFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setUploading(true);
    const supabase = createBrowserSupabase();
    try {
      for (const f of Array.from(files)) {
        // ── PDF-only restriction ───────────────────────────────────────────
        const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          setUploadError(`"${f.name}" is not a PDF. Only PDF files are accepted.`);
          continue;
        }

        // ── Per-file size limit ────────────────────────────────────────────
        if (f.size > MAX_FILE_BYTES) {
          setUploadError(`"${f.name}" exceeds the 50 MB limit (${humanSize(f.size)}). Please compress the file.`);
          continue;
        }

        // ── Pre-check org storage quota ────────────────────────────────────
        try {
          const usageRes = await fetch('/api/storage/usage', {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'fetch' },
          });
          if (usageRes.ok) {
            const usage = await usageRes.json();
            if (f.size > usage.remainingBytes) {
              setUploadError(
                `Storage limit reached. Your organisation has used ${usage.usedLabel} of ${usage.limitLabel}. ` +
                `This file is ${humanSize(f.size)} but only ${usage.remainingLabel} remains.`
              );
              continue;
            }
          }
        } catch {
          // Non-fatal — server will enforce the quota too
        }

        // Storage path: {orgId}/{packageId}/{uuid}_{filename}
        const safeFileName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const prefix = orgId || userId;
        const storagePath = `${prefix}/${packageId}/${crypto.randomUUID()}_${safeFileName}`;

        const { error: storageErr } = await supabase.storage
          .from("package-documents")
          .upload(storagePath, f, { cacheControl: "3600", upsert: false });

        if (storageErr) {
          setUploadError(`Upload failed: ${storageErr.message}`);
          continue;
        }

        // Register document metadata — server enforces quota again
        try {
          await onAddDocument({
            name: f.name,
            size: humanSize(f.size),
            sizeBytes: f.size,
            type: f.type || "application/pdf",
            storagePath,
          });
        } catch (apiErr: any) {
          // Server rejected (e.g. quota exceeded) — remove the orphaned file from storage
          await supabase.storage.from("package-documents").remove([storagePath]);
          setUploadError(apiErr.message || "Failed to register document.");
        }
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
        .createSignedUrl(doc.storagePath, 3600);
      if (error || !data?.signedUrl) {
        alert("Could not generate download link. Please try again.");
        return;
      }
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
        <span className="ml-auto text-xs text-slate-400">PDF only · 50 MB max</span>
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
                <span className="text-xs text-slate-400">PDF files only — up to 50 MB</span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              onChange={handleFiles}
              className="hidden"
              disabled={uploading}
            />
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
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{doc.size} • {doc.uploadedBy} • {formatDate(doc.uploadedAt)}</p>
              </div>

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
