"use client";

import { useRef } from "react";
import { Document } from "@/lib/types";
import { Paperclip, Upload, Trash2, FileText, FileSpreadsheet, File, Image } from "lucide-react";

interface DocumentsSectionProps {
  documents: Document[];
  onAddDocument: (name: string, size: string, type: string) => void;
  onDeleteDocument: (id: string) => void;
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

export default function DocumentsSection({ documents, onAddDocument, onDeleteDocument, readonly }: DocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const size = f.size < 1024 * 1024
        ? `${(f.size / 1024).toFixed(0)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
      onAddDocument(f.name, size, f.type || "application/octet-stream");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const size = f.size < 1024 * 1024
        ? `${(f.size / 1024).toFixed(0)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
      onAddDocument(f.name, size, f.type || "application/octet-stream");
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
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mx-4 mt-4 border-2 border-dashed border-slate-200 rounded-lg py-5 flex flex-col items-center gap-1.5 hover:border-blue-300 hover:bg-blue-50/40 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">
            Drag & drop or <span className="text-blue-600 font-medium">browse</span>
          </span>
          <span className="text-xs text-slate-400">Sandbox mode — no remote storage</span>
          <input ref={fileRef} type="file" multiple onChange={handleFiles} className="hidden" />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-400 text-sm italic">No documents attached.</div>
      ) : (
        <div className="divide-y divide-slate-100 mt-2">
          {documents.map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition">
              {iconForType(doc.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{doc.size} • {doc.uploadedBy} • {formatDate(doc.uploadedAt)}</p>
              </div>
              {!readonly && (
                <button onClick={() => onDeleteDocument(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
