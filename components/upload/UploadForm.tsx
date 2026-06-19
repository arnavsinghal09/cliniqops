"use client";

import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SectionLabel from "../ui-kit/SectionLabel";

type UploadResult = {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
};

type Status = "idle" | "uploading" | "success" | "error";

const EXPECTED_COLUMNS: Array<{ col: string; desc: string }> = [
  { col: "patient_name", desc: "Full patient name (required)" },
  { col: "appointment_date", desc: "YYYY-MM-DD (required)" },
  { col: "duration_minutes", desc: "Positive integer (required)" },
  { col: "appointment_type", desc: "e.g. Consultation, Follow-up (required)" },
  {
    col: "status",
    desc: "SCHEDULED / COMPLETED / CANCELLED / NO_SHOW (required)",
  },
  {
    col: "doctor_email",
    desc: "Must match an existing clinic user (required)",
  },
  { col: "billed_cpt_code", desc: "CPT code, blank if unbilled (optional)" },
  { col: "billed_amount", desc: "Amount in your currency (optional)" },
  { col: "date_of_birth", desc: "YYYY-MM-DD (optional)" },
  { col: "icd10_codes", desc: "Pipe-separated, e.g. E11.9|I10 (optional)" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  function acceptFile(f: File | undefined | null) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setStatus("error");
      setErrorMsg("Please choose a .csv file.");
      return;
    }
    setFile(f);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  }

  function clearFile() {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as UploadResult;
          setResult(parsed);
          setStatus("success");
        } catch {
          setStatus("error");
          setErrorMsg("Server returned an unexpected response.");
        }
      } else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) msg = body.error;
        } catch {}
        setStatus("error");
        setErrorMsg(msg);
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    };

    xhr.open("POST", "/api/upload/appointments");
    xhr.send(formData);
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <SectionLabel
        eyebrow="Import scheduling and billing exports from your practice management
        system"
        title="Upload Appointment Data"
      />

      {/* Dropzone */}
      <div
        data-tour="upload-dropzone"
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          // Keyboard accessibility: space/enter opens the file picker.
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-6 cursor-pointer rounded-card border-2 border-dashed p-16 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          dragging
            ? "border-brand-light bg-bg"
            : "border-border bg-surface hover:border-brand-light hover:bg-bg"
        }`}
      >
        <UploadCloud
          className="mx-auto text-ink-4"
          size={40}
          strokeWidth={1.5}
        />
        <p className="mt-3 text-sm font-medium text-ink-2">
          Drop your CSV here or click to browse
        </p>
        <p className="mt-1 text-xs text-ink-4">
          Supports scheduling exports from Athena, DrChrono, and generic CSV
          formats
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      {/* Selected-file row */}
      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-ctrl bg-bg p-3">
          <FileText className="text-brand" size={20} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-2">
              {file.name}
            </p>
            <p className="text-xs text-ink-4">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            aria-label="Remove file"
            className="rounded-ctrl p-1.5 text-ink-4 transition-colors hover:bg-border-soft hover:text-ink-2 focus-visible:ring-2 focus-visible:ring-brand outline-none"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Progress (during upload) */}
      {status === "uploading" && (
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-xs text-ink-3">Uploading… {progress}%</p>
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        className="mt-6 rounded-ctrl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-105 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 outline-none"
      >
        {status === "uploading" ? "Uploading…" : "Upload"}
      </button>

      {status === "success" && result && (
        <div className="mt-6 animate-rise rounded-card bg-brand-muted p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-brand-light shrink-0" size={32} />
            <div className="flex-1">
              <p className="text-lg font-semibold text-brand">
                {result.imported} appointments imported successfully
              </p>
              <a
                href="/dashboard?fresh=true"
                className="mt-4 inline-flex items-center gap-2 rounded-ctrl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:brightness-105 hover:-translate-y-px"
              >
                View your dashboard →
              </a>
              {result.skipped > 0 && (
                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="flex items-center gap-2 rounded-badge bg-warning-bg px-3 py-1.5 text-xs font-medium text-warning outline-none focus-visible:ring-2 focus-visible:ring-warning">
                    <AlertTriangle size={14} />
                    {result.skipped} rows skipped — view reasons
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ul className="space-y-1 rounded-ctrl bg-surface p-3 text-xs text-ink-3">
                      {result.errors.map((e, idx) => (
                        <li key={idx}>
                          <span className="font-medium text-ink-2">
                            Row {e.row}:
                          </span>{" "}
                          {e.reason}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error card */}
      {status === "error" && (
        <div className="mt-6 rounded-card bg-danger-bg p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-danger shrink-0" size={20} />
            <p className="text-sm font-medium text-danger">{errorMsg}</p>
          </div>
        </div>
      )}

      <Collapsible className="mt-10">
        <CollapsibleTrigger className="text-sm font-medium text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-badge">
          ▸ Expected CSV format
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 overflow-hidden rounded-card border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-row-hover">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Column
                  </th>
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXPECTED_COLUMNS.map((c) => (
                  <tr key={c.col} className="border-t border-border-soft">
                    <td className="px-4 py-3 font-mono text-xs text-ink-2">
                      {c.col}
                    </td>
                    <td className="px-4 py-3 text-ink-3">{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
