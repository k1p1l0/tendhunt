"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, FileText, Upload, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface DocumentsSectionProps {
  documentKeys: string[];
  onDocumentsUpdated: (newKeys: string[]) => void;
}

/** Extract display filename from R2 key (e.g. "documents/user_123/abc-report.pdf" -> "report.pdf") */
function getDisplayName(key: string): string {
  const filename = key.split("/").pop() || key;
  // Remove nanoid prefix (21 chars + dash)
  const dashIdx = filename.indexOf("-");
  if (dashIdx > 0 && dashIdx <= 22) {
    return filename.slice(dashIdx + 1);
  }
  return filename;
}

export function DocumentsSection({
  documentKeys,
  onDocumentsUpdated,
}: DocumentsSectionProps) {
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleDelete = useCallback(
    async (key: string) => {
      const confirmed = window.confirm(
        `Delete "${getDisplayName(key)}"? This cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingKey(key);
      try {
        const res = await fetch("/api/profile/documents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });

        if (!res.ok) {
          throw new Error("Failed to delete document");
        }

        const newKeys = documentKeys.filter((k) => k !== key);
        onDocumentsUpdated(newKeys);
        toast.success("Document deleted");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete document"
        );
      } finally {
        setDeletingKey(null);
      }
    },
    [documentKeys, onDocumentsUpdated]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploadingCount((c) => c + acceptedFiles.length);
      const newKeys: string[] = [];

      for (const file of acceptedFiles) {
        try {
          // 1. Get presigned URL
          const presignRes = await fetch("/api/upload/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          });

          if (!presignRes.ok) {
            const err = await presignRes.json();
            throw new Error(err.error || "Failed to get upload URL");
          }

          const { url, key } = await presignRes.json();

          // 2. Upload to R2
          const uploadRes = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${file.name}`);
          }

          // 3. Add document key to profile
          const patchRes = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentKeys: [...documentKeys, ...newKeys, key],
            }),
          });

          if (!patchRes.ok) {
            throw new Error("Failed to update profile");
          }

          newKeys.push(key);
          toast.success(`"${file.name}" uploaded`);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : `Failed to upload ${file.name}`
          );
        } finally {
          setUploadingCount((c) => c - 1);
        }
      }

      if (newKeys.length > 0) {
        onDocumentsUpdated([...documentKeys, ...newKeys]);
      }
    },
    [documentKeys, onDocumentsUpdated]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="space-y-4">
      {/* Document list */}
      {documentKeys.length === 0 && uploadingCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents uploaded yet
        </p>
      ) : (
        <div className="space-y-2">
          {documentKeys.map((key) => (
            <Card
              key={key}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{getDisplayName(key)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(key)}
                disabled={deletingKey === key}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                {deletingKey === key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }`}
      >
        <input {...getInputProps()} />
        {uploadingCount > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">
              Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}...
            </p>
          </div>
        ) : isDragActive ? (
          <>
            <Upload className="mx-auto mb-2 size-8 text-primary" />
            <p className="text-sm font-medium text-primary">
              Drop your documents here...
            </p>
          </>
        ) : (
          <>
            <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drag & drop documents here, or click to select
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, DOC, TXT -- max 10MB each, up to 10 files
            </p>
          </>
        )}
      </div>
    </div>
  );
}
