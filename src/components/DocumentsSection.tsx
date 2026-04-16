"use client";

import { useState, useRef } from "react";
import { Document } from "@/lib/types";
import { Paperclip, Upload, Trash2, FileText, FileSpreadsheet, File, Image } from "lucide-react";

interface DocumentsSectionProps {
  documents: Document[];
  onAddDocument: (name: string, size: string, type: string) => void;
  onDeleteDocument: (id: string) => void;
  readonly?: boolean;
}

const iconForType = (type: string) => {
  if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (type.includes("sheet") || type.includes("excel") || type.includes("xlsx")) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (type.includes("image")) return <Image className="w-5 h-5 text-purple-500" />;
  if (type.includes("word") || type.includes("doc")) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-teal-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Documents</h3>
        <span className="text-xs text-gray-400 ml-1">({documents.length})</span>
      </div>

      {!readonly && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="mx-4 mt-4 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-gray-400" />
          <span className="text-sm text-gray-500">
            Drag & drop or <span className="text-blue-600 font-medium">browse</span>
          </span>
          <span className="text-xs text-gray-400">Mock upload — files are not stored</span>
          <input ref={fileRef} type="file" multiple onChange={handleFiles} className="hidden" />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="px-5 py-6 text-center text-gray-400 text-sm">No documents attached.</div>
      ) : (
        <div className="divide-y divide-gray-50 mt-2">
          {documents.map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
              {iconForType(doc.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-[11px] text-gray-400">{doc.size} • {doc.uploadedBy} • {formatDate(doc.uploadedAt)}</p>
              </div>
              {!readonly && (
                <button onClick={() => onDeleteDocument(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
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
