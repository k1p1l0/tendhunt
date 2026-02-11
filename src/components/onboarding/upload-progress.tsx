"use client";

import { CheckCircle2, AlertCircle, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  file: File;
  key: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  errorMessage?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadProgress({
  files,
  onRemove,
}: {
  files: UploadedFile[];
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {files.map((f, index) => (
        <div
          key={`${f.file.name}-${index}`}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <FileText className="size-5 shrink-0 text-muted-foreground" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium">{f.file.name}</p>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {formatFileSize(f.file.size)}
              </span>
            </div>

            {/* Progress bar */}
            {(f.status === "uploading" || f.status === "pending") && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${f.progress}%` }}
                />
              </div>
            )}

            {f.status === "error" && f.errorMessage && (
              <p className="mt-1 text-xs text-destructive">{f.errorMessage}</p>
            )}
          </div>

          {/* Status icon */}
          <div className="shrink-0">
            {f.status === "uploading" && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
            {f.status === "pending" && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            {f.status === "done" && (
              <CheckCircle2 className="size-4 text-green-600" />
            )}
            {f.status === "error" && (
              <AlertCircle className="size-4 text-destructive" />
            )}
          </div>

          {/* Remove button (only for done/error) */}
          {(f.status === "done" || f.status === "error") && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${f.file.name}`}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
