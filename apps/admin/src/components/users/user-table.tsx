"use client";

import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";

import type { EnrichedUser } from "@/lib/users";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserTableProps {
  users: EnrichedUser[];
  loading: boolean;
}

function getInitials(
  firstName: string | null,
  lastName: string | null
): string {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-14 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
    </TableRow>
  );
}

export function UserTable({ users, loading }: UserTableProps) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Onboarding</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Signed Up</TableHead>
            <TableHead>Last Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">No users found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Onboarding</TableHead>
          <TableHead>Credits</TableHead>
          <TableHead>Signed Up</TableHead>
          <TableHead>Last Active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            className="transition-colors duration-100"
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={user.imageUrl}
                    alt={`${user.firstName ?? ""} ${user.lastName ?? ""}`}
                  />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email ?? "No email"}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {user.companyName || (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </span>
            </TableCell>
            <TableCell>
              <Badge
                variant={user.role === "admin" ? "default" : "secondary"}
                className={
                  user.role === "admin"
                    ? "bg-purple-600 hover:bg-purple-600"
                    : ""
                }
              >
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.onboardingComplete ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-3.5 w-3.5" />
                  Complete
                </span>
              ) : (
                <span className="text-sm text-yellow-600">
                  Pending
                </span>
              )}
            </TableCell>
            <TableCell>
              <div>
                <p className="text-sm font-medium">
                  {user.creditBalance} credits
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.totalCreditsSpent} spent
                </p>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(user.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground">
                {user.lastSignInAt
                  ? formatDistanceToNow(new Date(user.lastSignInAt), {
                      addSuffix: true,
                    })
                  : "Never"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
