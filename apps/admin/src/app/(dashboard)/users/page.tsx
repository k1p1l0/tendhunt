"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, Shield, CheckCircle, Coins } from "lucide-react";

import type { EnrichedUser } from "@/lib/users";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserTable } from "@/components/users/user-table";

export default function UsersPage() {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => fetchUsers(), 30_000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const adminCount = users.filter((u) => u.role === "admin").length;
    const onboardedCount = users.filter(
      (u) => u.onboardingComplete
    ).length;
    const totalCredits = users.reduce(
      (sum, u) => sum + u.creditBalance,
      0
    );

    return { adminCount, onboardedCount, totalCredits };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              {total} total
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">
                  Total Users
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.adminCount}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.onboardedCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Onboarded
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalCredits}
                </p>
                <p className="text-xs text-muted-foreground">
                  Credits in Circulation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <UserTable users={users} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
