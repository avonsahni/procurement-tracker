"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { Send, Paperclip, X, Loader2 } from "lucide-react";
import { postMessageAction } from "./actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { OrgMember } from "@/lib/communication/queries";

export type { OrgMember };

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_DROPDOWN = 6;
const TYPING_THROTTLE_MS = 1500;

// Only images and PDF — enforced here and mirrored server-side in actions.ts
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf";
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
]);
const MAX_PDF_BYTES  = 10 * 1024 * 1024; // 10 MB
const MAX_IMG_BYTES  =  5 * 1024 * 1024; //  5 MB (before compression)
const COMPRESS_SKIP  =       200 * 1024; // don't compress images already <200 KB
const MAX_IMG_WIDTH  = 1920;
const JPEG_QUALITY   = 0.82;

// ── Image compression (canvas → JPEG) ────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  // Skip tiny images — compression won't help and costs time
  if (file.size < COMPRESS_SKIP) return file;

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Scale down to max width while keeping aspect ratio
      if (w > MAX_IMG_WIDTH) {
        h = Math.round(h * (MAX_IMG_WIDTH / w));
        w = MAX_IMG_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      // White background for transparent PNGs before converting to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression made it bigger or failed — keep original
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback: send original
    };

    img.src = url;
  });
}

// ── ComposeBox ────────────────────────────────────────────────────────────────

export default function ComposeBox({
  threadId,
  channelId,
  members,
  currentUserId,
  currentUserName,
}: {
  threadId: string;
  channelId: string;
  members: OrgMember[];
  currentUserId: string;
  currentUserName: string;
}) {
  const [body, setBody]               = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [query, setQuery]             = useState<string | null>(null);
  const [dropIdx, setDropIdx]         = useState(0);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [isPending, startTransition]  = useTransition();

  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const lastTypingTs  = useRef(0);
  const typingChRef   = useRef<ReturnType<ReturnType<typeof createBrowserSupabase>["channel"]> | null>(null);

  // ── Typing broadcast channel ────────────────────────────────────────────────
  useEffect(() => {
    const sb = createBrowserSupabase();
    const ch = sb.channel(`typing:${threadId}`);
    ch.subscribe();
    typingChRef.current = ch;
    return () => { sb.removeChannel(ch); };
  }, [threadId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingTs.current < TYPING_THROTTLE_MS) return;
    lastTypingTs.current = now;
    typingChRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, full_name: currentUserName },
    });
  }, [currentUserId, currentUserName]);

  // ── @mention ────────────────────────────────────────────────────────────────
  const filtered =
    query !== null
      ? members
          .filter((m) => m.full_name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, MAX_DROPDOWN)
      : [];

  function syncQuery(val: string, pos: number) {
    const m = val.slice(0, pos).match(/@([^@\s]*)$/);
    if (m) { setQuery(m[1]); setDropIdx(0); }
    else    setQuery(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);
    syncQuery(val, e.target.selectionStart ?? val.length);
    if (val.trim()) broadcastTyping();
  }

  function pickMember(m: OrgMember) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos   = ta.selectionStart ?? body.length;
    const atIdx = body.slice(0, pos).lastIndexOf("@");
    const token = `@${m.full_name} `;
    const next  = body.slice(0, atIdx) + token + body.slice(pos);
    setBody(next);
    setQuery(null);
    setMentionedIds((p) => (p.includes(m.id) ? p : [...p, m.id]));
    setTimeout(() => {
      const c = atIdx + token.length;
      ta.focus();
      ta.setSelectionRange(c, c);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || filtered.length === 0) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setDropIdx((i) => Math.min(i + 1, filtered.length - 1)); break;
      case "ArrowUp":   e.preventDefault(); setDropIdx((i) => Math.max(i - 1, 0)); break;
      case "Enter":     e.preventDefault(); pickMember(filtered[dropIdx]); break;
      case "Escape":    setQuery(null); break;
    }
  }

  // ── File attachment ─────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setAttachedFile(null); return; }

    // Type gate — only images and PDF
    if (!ALLOWED_MIME.has(f.type)) {
      alert("Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.");
      e.target.value = "";
      return;
    }

    // Size gate before compression
    const isPdf = f.type === "application/pdf";
    const limit = isPdf ? MAX_PDF_BYTES : MAX_IMG_BYTES;
    if (f.size > limit) {
      alert(`File is too large. Maximum ${isPdf ? "10 MB for PDFs" : "5 MB for images"}.`);
      e.target.value = "";
      return;
    }

    if (isPdf) {
      setAttachedFile(f);
      return;
    }

    // Compress images
    setCompressing(true);
    try {
      const compressed = await compressImage(f);
      setAttachedFile(compressed);
    } catch {
      setAttachedFile(f);
    } finally {
      setCompressing(false);
    }
  }

  function clearAttachment() {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Form submit — programmatic so compressed File reaches the server action ─
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || isPending || compressing) return;

    const fd = new FormData();
    fd.set("threadId", threadId);
    fd.set("channelId", channelId);
    fd.set("body", body);
    fd.set("mentionedUserIds", JSON.stringify(mentionedIds));
    if (attachedFile) fd.set("attachment", attachedFile, attachedFile.name);

    startTransition(async () => {
      await postMessageAction(fd);
    });
  }

  const busy = isPending || compressing;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={handleFileChange}
      />

      {/* Attachment preview */}
      {(attachedFile || compressing) && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          {compressing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
              <span className="flex-1 text-blue-600">Compressing image…</span>
            </>
          ) : attachedFile ? (
            <>
              <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="flex-1 truncate text-blue-700">{attachedFile.name}</span>
              <span className="text-blue-400 shrink-0">
                {(attachedFile.size / 1024).toFixed(0)} KB
              </span>
              <button type="button" onClick={clearAttachment}
                className="text-blue-400 hover:text-blue-600 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : null}
        </div>
      )}

      <div className="flex gap-3 items-end relative">
        {/* @mention dropdown */}
        {query !== null && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              Mention a person
            </p>
            {filtered.map((m, idx) => (
              <button key={m.id} type="button"
                onMouseDown={(e) => { e.preventDefault(); pickMember(m); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                  idx === dropIdx ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-700">
                    {m.full_name[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-800 truncate">{m.full_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Attach button */}
        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={compressing}
          title="Attach image or PDF (max 5 MB image / 10 MB PDF)"
          className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40 transition shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea ref={textareaRef} name="body" value={body}
          onChange={handleChange} onKeyDown={handleKeyDown}
          required rows={2}
          placeholder="Write a message… type @ to mention someone"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none" />

        <button type="submit" disabled={busy}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shrink-0">
          {compressing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Compressing…</>
          ) : isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
          ) : (
            <><Send className="w-3.5 h-3.5" /> Send</>
          )}
        </button>
      </div>
    </form>
  );
}
