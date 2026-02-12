"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { UploadProgress, type UploadedFile } from "./upload-progress";

function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

export function DocumentDropzone({
  onFilesChange,
}: {
  onFilesChange: (keys: string[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const updateFile = useCallback(
    (index: number, update: Partial<UploadedFile>) => {
      setFiles((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...update };
        return next;
      });
    },
    []
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const startIndex = files.length;

      // Add new files as pending
      const newEntries: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        key: "",
        status: "pending" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newEntries]);

      // Upload each file
      for (let i = 0; i < acceptedFiles.length; i++) {
        const fileIndex = startIndex + i;
        const file = acceptedFiles[i];

        try {
          // Update to uploading
          updateFile(fileIndex, { status: "uploading" });

          // 1. Get presigned URL
          const res = await fetch("/api/upload/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to get upload URL");
          }

          const { url, key } = await res.json();

          // 2. Upload to R2 with progress tracking
          await uploadFileWithProgress(url, file, (progress) => {
            updateFile(fileIndex, { progress });
          });

          // 3. Mark as done
          updateFile(fileIndex, { status: "done", key, progress: 100 });

          // Notify parent with updated keys
          setFiles((prev) => {
            const doneKeys = prev
              .map((f, idx) => (idx === fileIndex ? { ...f, key, status: "done" as const } : f))
              .filter((f) => f.status === "done" && f.key)
              .map((f) => f.key);
            onFilesChange(doneKeys);
            return prev.map((f, idx) =>
              idx === fileIndex ? { ...f, key, status: "done" as const, progress: 100 } : f
            );
          });
        } catch (error) {
          updateFile(fileIndex, {
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : "Upload failed",
          });
        }
      }
    },
    [files.length, onFilesChange, updateFile]
  );

  const handleRemove = useCallback(
    (index: number) => {
      setFiles((prev) => {
        const next = prev.filter((_, i) => i !== index);
        const doneKeys = next
          .filter((f) => f.status === "done" && f.key)
          .map((f) => f.key);
        onFilesChange(doneKeys);
        return next;
      });
    },
    [onFilesChange]
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
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-3 size-10 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">
            Drop your documents here...
          </p>
        ) : (
          <p className="text-sm font-medium">
            Drag & drop company documents here, or click to select
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          PDF, DOCX, DOC, TXT -- max 10MB each, up to 10 files
        </p>
      </div>

      <UploadProgress files={files} onRemove={handleRemove} />
    </div>
  );
}
