"use client";

import { useEffect, useState, useRef } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, Settings, ChevronDown } from "lucide-react";

interface ProfileData {
  logoUrl: string;
  companyName: string;
}

export function SidebarCompanyHeader() {
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Click anywhere on the header → trigger Clerk's UserButton click
  const handleClick = () => {
    const clerkButton = containerRef.current?.querySelector(
      "button[data-clerk-component]"
    ) as HTMLButtonElement | null;
    // Fallback: find any button inside the Clerk UserButton wrapper
    const fallback = containerRef.current?.querySelector(
      ".cl-userButtonTrigger"
    ) as HTMLButtonElement | null;
    (clerkButton || fallback)?.click();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const companyName = profile?.companyName;

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden Clerk UserButton — positioned behind our custom UI */}
      <div className="absolute top-3 left-3 opacity-0 pointer-events-none">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-10",
            },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Dashboard"
              labelIcon={<LayoutDashboard className="size-4" />}
              href="/dashboard"
            />
            <UserButton.Link
              label="Settings"
              labelIcon={<Settings className="size-4" />}
              href="/settings"
            />
            <UserButton.Action label="manageAccount" />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
      </div>

      {/* Custom clickable header — triggers Clerk popover */}
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-3 p-3 hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer"
      >
        {/* User avatar with company logo badge */}
        <div className="relative shrink-0">
          <Avatar className="size-10">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          {companyName && profile?.logoUrl && (
            <Avatar className="absolute -bottom-1 -right-1 size-6 rounded-md border-2 border-sidebar">
              <AvatarImage src={profile.logoUrl} className="rounded-sm" />
              <AvatarFallback className="rounded-sm bg-primary/10 text-[8px] font-semibold">
                {companyName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Name + company */}
        <div className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-sm truncate">{userName || "User"}</p>
          {companyName ? (
            <p className="text-xs text-muted-foreground truncate">{companyName}</p>
          ) : (
            <p className="text-xs text-muted-foreground truncate">Set up profile</p>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}
