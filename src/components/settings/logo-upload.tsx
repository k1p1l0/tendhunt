"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, RefreshCw } from "lucide-react";

interface LogoUploadProps {
  logoUrl: string | null;
  companyName: string;
  onLogoUpdated: (newLogoUrl: string) => void;
}

export function LogoUpload({
  logoUrl,
  companyName,
  onLogoUpdated,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get initials for fallback avatar
  const initials = (companyName || "C")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        // 1. Get presigned URL from logo endpoint
        const presignRes = await fetch("/api/profile/logo", {
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

        // 2. Upload file directly to R2 via presigned URL
        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }

        // 3. Update profile with new logo key
        const patchRes = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl: key }),
        });

        if (!patchRes.ok) {
          throw new Error("Failed to update profile with new logo");
        }

        // 4. Update parent state
        setImgError(false);
        onLogoUpdated(key);
        toast.success("Logo updated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload logo"
        );
      } finally {
        setIsUploading(false);
        // Reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onLogoUpdated]
  );

  const handleReExtract = useCallback(async () => {
    if (logoUrl) {
      const confirmed = window.confirm(
        "This will replace your current logo with one extracted from your website or LinkedIn. Continue?"
      );
      if (!confirmed) return;
    }

    setIsExtracting(true);
    try {
      const res = await fetch("/api/profile/logo-extract", {
        method: "POST",
      });

      if (res.status === 404) {
        toast.error("No logo found from website or LinkedIn");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to extract logo");
      }

      const data = await res.json();
      setImgError(false);
      onLogoUpdated(data.logoUrl);
      toast.success("Logo extracted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to extract logo"
      );
    } finally {
      setIsExtracting(false);
    }
  }, [logoUrl, onLogoUpdated]);

  const showImage = logoUrl && !imgError;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Logo container with hover overlay */}
      <div className="group relative size-20 overflow-hidden rounded-lg">
        {showImage ? (
          <img
            src={logoUrl}
            alt={`${companyName || "Company"} logo`}
            className="size-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-lg font-semibold text-muted-foreground">
            {initials}
          </div>
        )}

        {/* Hover overlay for upload */}
        <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {isUploading ? (
            <Loader2 className="size-6 animate-spin text-white" />
          ) : (
            <Upload className="size-6 text-white" />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="sr-only"
          />
        </label>
      </div>

      {/* Re-extract button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleReExtract}
        disabled={isExtracting || isUploading}
        className="text-xs"
      >
        {isExtracting ? (
          <>
            <Loader2 className="mr-1 size-3 animate-spin" />
            Extracting...
          </>
        ) : (
          <>
            <RefreshCw className="mr-1 size-3" />
            Re-extract from website
          </>
        )}
      </Button>
    </div>
  );
}
