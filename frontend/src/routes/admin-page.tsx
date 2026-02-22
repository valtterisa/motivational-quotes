import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/state/use-auth";
import { authClient } from "@/lib/auth-client";
import { apiCall, queryKeys } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PAGE_SIZE = 20;

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
}

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [roleUserId, setRoleUserId] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState<"admin" | "user">("user");

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "listUsers"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
  };

  const isAdmin = user?.role === "admin";
  if (!user || !isAdmin) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const { data: listData, isLoading: listLoading, isError: listError, error: listErr } = useQuery({
    queryKey: ["admin", "listUsers", page],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      if (res.error) throw new Error(res.error.message ?? "Failed to list users");
      return res.data as { users: AdminUser[]; total: number; limit?: number; offset?: number };
    },
    enabled: isAdmin,
  });

  const { data: statsData } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () =>
      apiCall<{ quoteCountByUserId: Record<string, number>; apiKeyCountByUserId: Record<string, number> }>(
        "/api/v1/admin/stats",
      ),
    enabled: isAdmin,
  });

  const users = listData?.users ?? [];
  const total = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const quoteCountByUserId = statsData?.quoteCountByUserId ?? {};
  const apiKeyCountByUserId = statsData?.apiKeyCountByUserId ?? {};

  const handleSetRole = async (userId: string) => {
    const res = await authClient.admin.setRole({ userId, role: roleValue });
    if (res.error) return;
    setRoleUserId(null);
    invalidateList();
  };

  const handleBan = async (userId: string) => {
    await authClient.admin.banUser({ userId });
    invalidateList();
  };

  const handleUnban = async (userId: string) => {
    await authClient.admin.unbanUser({ userId });
    invalidateList();
  };

  const handleImpersonate = async (userId: string) => {
    const res = await authClient.admin.impersonateUser({ userId });
    if (!res.error && res.data) {
      window.location.href = "/dashboard";
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Permanently remove this user?")) return;
    await authClient.admin.removeUser({ userId });
    invalidateList();
  };

  if (listLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <p className="text-muted-foreground text-sm text-center">Loading users...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (listError) {
    return (
      <Alert variant="destructive" className="max-w-5xl">
        <AlertDescription>Error: {listErr?.message ?? "Failed to load users"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          User list and stats. Total: {total}
        </p>
      </div>
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/80 hover:bg-transparent">
                <TableHead className="font-medium">Email</TableHead>
                <TableHead className="font-medium">Name</TableHead>
                <TableHead className="font-medium w-24">Role</TableHead>
                <TableHead className="font-medium w-20">Banned</TableHead>
                <TableHead className="font-medium w-24">Quotes</TableHead>
                <TableHead className="font-medium w-24">API Keys</TableHead>
                <TableHead className="font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-border/60">
                  <TableCell className="text-foreground/90">{u.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.role ?? "user"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.banned ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{quoteCountByUserId[u.id] ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{apiKeyCountByUserId[u.id] ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {roleUserId === u.id ? (
                        <>
                          <select
                            value={roleValue}
                            onChange={(e) => setRoleValue(e.target.value === "admin" ? "admin" : "user")}
                            className="rounded border border-input bg-background px-2 py-1 text-sm"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          <Button size="sm" variant="secondary" onClick={() => handleSetRole(u.id)}>
                            Set
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRoleUserId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setRoleUserId(u.id); setRoleValue(u.role === "admin" ? "admin" : "user"); }}>
                          Set role
                        </Button>
                      )}
                      {u.banned ? (
                        <Button size="sm" variant="outline" onClick={() => handleUnban(u.id)}>Unban</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleBan(u.id)}>Ban</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleImpersonate(u.id)}>Impersonate</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRemove(u.id)}>Remove</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
