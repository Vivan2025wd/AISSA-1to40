"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  Upload,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Cloud,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  maxSizeMB?: number;
  /** Label (e.g., "Diagram") */
  label?: string;
  /** English sub-label (shown small, top-right) */
  sublabel?: string;
  disabled?: boolean;
}

const DEFAULT_BUCKET = "question-images";
const DEFAULT_MAX_MB = 5;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ImageUploadField({
  value,
  onChange,
  bucket = DEFAULT_BUCKET,
  maxSizeMB = DEFAULT_MAX_MB,
  label = "Diagram",
  sublabel = "Optional",
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------- Upload ---------- */

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("PNG, JPG, WEBP, or GIF only.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be smaller than ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    setUploading(false);
    onChange(publicUrl);
  }

  /* ---------- URL ---------- */

  function applyUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      setError("URL must start with http:// or https://");
      return;
    }
    setError(null);
    onChange(u);
    setUrlInput("");
  }

  /* ---------- Render ---------- */

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900">{label}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {sublabel}
        </span>
      </div>

      {value ? (
        /* ---------- Preview state ---------- */
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="max-h-48 w-auto rounded-xl border border-slate-200 object-contain shadow-sm sm:max-h-40"
            />
            <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:opacity-50 sm:w-fit sm:py-2 sm:text-xs"
            >
              <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Remove image
            </button>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200/50">
              {value}
            </p>
          </div>
        </div>
      ) : (
        /* ---------- Upload state ---------- */
        <>
          {/* Mode toggle */}
          <div className="mb-4 inline-flex w-full rounded-xl bg-slate-100 p-1 text-sm sm:w-auto sm:text-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("upload")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition active:scale-[0.98] sm:flex-none sm:py-1.5 ${
                mode === "upload"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="h-4 w-4 sm:h-3 sm:w-3" />
              Upload
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("url")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition active:scale-[0.98] sm:flex-none sm:py-1.5 ${
                mode === "url"
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LinkIcon className="h-4 w-4 sm:h-3 sm:w-3" />
              URL
            </button>
          </div>

          {mode === "upload" ? (
            /* ---------- Upload drop zone ---------- */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (disabled) return;
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
                dragOver
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_MIME.join(",")}
                hidden
                disabled={disabled}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
                aria-label="Choose image file"
              />

              {uploading ? (
                <>
                  <div className="relative grid h-14 w-14 place-items-center rounded-full bg-sky-50">
                    <span className="absolute inset-0 animate-ping rounded-full bg-sky-100 opacity-40" />
                    <Loader2 className="relative h-6 w-6 animate-spin text-sky-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Uploading image…
                  </p>
                </>
              ) : (
                <>
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-full transition sm:h-12 sm:w-12 ${
                      dragOver
                        ? "bg-linear-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/30"
                        : "bg-white text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {dragOver ? (
                      <Cloud className="h-6 w-6 sm:h-5 sm:w-5" />
                    ) : (
                      <ImageIcon className="h-6 w-6 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-b from-sky-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:from-sky-600 hover:to-sky-700 active:scale-[0.98] disabled:opacity-50 sm:mt-3 sm:px-4 sm:py-2 sm:text-xs"
                  >
                    <Upload className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    Choose file
                  </button>
                  <p className="mt-2 text-xs text-slate-500 sm:text-[11px]">
                    or drag &amp; drop · PNG, JPG, WEBP · max {maxSizeMB}MB
                  </p>
                </>
              )}
            </div>
          ) : (
            /* ---------- URL input ---------- */
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 sm:py-2.5"
                  placeholder="https://example.com/diagram.png"
                  disabled={disabled}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyUrl();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={applyUrl}
                disabled={disabled || !urlInput.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-linear-to-b from-sky-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:from-sky-600 hover:to-sky-700 active:scale-[0.98] disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none sm:px-4 sm:py-2.5"
              >
                Apply
              </button>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}