"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  Upload,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  maxSizeMB?: number;
  label?: string;
  sublabel?: string;
  disabled?: boolean;
}

const DEFAULT_BUCKET = "question-images";
const DEFAULT_MAX_MB = 5;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ImageUploadField({
  value,
  onChange,
  bucket = DEFAULT_BUCKET,
  maxSizeMB = DEFAULT_MAX_MB,
  label = "රූපය",
  sublabel = "Diagram (optional)",
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("PNG, JPG, WEBP හෝ GIF පමණක් අනුමතයි.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`රූපය ${maxSizeMB}MB ට වඩා කුඩා විය යුතුය.`);
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

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    setUploading(false);
    onChange(publicUrl);
  }

  function applyUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      setError("URL http:// හෝ https:// ලෙස ආරම්භ විය යුතුය.");
      return;
    }
    setError(null);
    onChange(u);
    setUrlInput("");
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-xs text-slate-400">{sublabel}</span>
      </div>

      {value ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="max-h-40 rounded-lg border border-slate-200 object-contain"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="btn-outline text-xs"
            >
              <X className="h-3.5 w-3.5" /> ඉවත් කරන්න
            </button>
            <p className="max-w-xs break-all text-[10px] text-slate-400">{value}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("upload")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                mode === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              උඩුගත කරන්න
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("url")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                mode === "url" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              URL
            </button>
          </div>

          {mode === "upload" ? (
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
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${
                dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300"
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
              />

              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                  <p className="mt-2 text-xs text-slate-600">උඩුගත වෙමින්...</p>
                </>
              ) : (
                <>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileRef.current?.click()}
                    className="btn-outline mt-3 text-xs"
                  >
                    <Upload className="h-3.5 w-3.5" /> ගොනුව තෝරන්න
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    හෝ මෙතැනට අදින්න · PNG/JPG · max {maxSizeMB}MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  className="input pl-9"
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
                className="btn-outline"
              >
                යොදන්න
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}