"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  logoUrl: string;
  companyName: string;
}

export function SidebarCompanyHeader() {
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProfile(data?.profile || null);
        setIsLoading(false);
      })
      .catch(() => {
        setProfile(null);
        setIsLoading(false);
      });
  }, []);

  // Listen for profile updates dispatched from Settings page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail?.logoUrl !== undefined) {
        setProfile((prev) =>
          prev
            ? { ...prev, logoUrl: event.detail.logoUrl }
            : { logoUrl: event.detail.logoUrl, companyName: event.detail.companyName || "" }
        );
      }
      if (event.detail?.companyName !== undefined) {
        setProfile((prev) =>
          prev
            ? { ...prev, companyName: event.detail.companyName }
            : { logoUrl: "", companyName: event.detail.companyName }
        );
      }
    };

    window.addEventListener(
      "profile-updated",
      handleProfileUpdate as EventListener
    );
    return () =>
      window.removeEventListener(
        "profile-updated",
        handleProfileUpdate as EventListener
      );
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Profile exists — show company logo + name
  if (profile?.companyName) {
    return (
      <Link
        href="/settings"
        className="flex items-center gap-3 p-3 hover:bg-sidebar-accent rounded-md transition-colors"
      >
        <Avatar className="size-8 rounded-md">
          <AvatarImage
            src={profile.logoUrl || ""}
            className="rounded-md"
          />
          <AvatarFallback className="rounded-md bg-primary/10 text-xs font-semibold">
            {profile.companyName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate">
          {profile.companyName}
        </span>
      </Link>
    );
  }

  // Fallback — Clerk user avatar + name
  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 p-3 hover:bg-sidebar-accent rounded-md transition-colors"
    >
      <Avatar className="size-8">
        <AvatarImage src={user?.imageUrl} />
        <AvatarFallback className="text-xs">
          {user?.firstName?.[0]}
          {user?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium text-sm truncate">
        {user?.firstName} {user?.lastName}
      </span>
    </Link>
  );
}
