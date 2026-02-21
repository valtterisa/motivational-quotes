import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/state/use-auth";
import { apiCall, getCsrfToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LayoutDashboard,
  Rss,
  Quote,
  Heart,
  Bookmark,
  Key,
  FileText,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/", label: "Feed", icon: Rss },
  { to: "/dashboard/quotes", label: "My Quotes", icon: Quote },
  { to: "/dashboard/liked", label: "Liked", icon: Heart },
  { to: "/dashboard/saved", label: "Saved", icon: Bookmark },
  { to: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { to: "/dashboard/docs", label: "API Docs", icon: FileText },
] as const;

export const DashboardLayout = () => {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await getCsrfToken();
      await apiCall("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      navigate("/");
    }
  };

  const nav = (
    <nav className="flex flex-col gap-0.5 flex-1">
      {navItems.map(({ to, label, icon: Icon }) => (
        <Button
          key={to}
          variant="ghost"
          asChild
          className="justify-start min-h-[44px] gap-3 px-3 rounded-lg text-foreground/90 hover:text-foreground hover:bg-sidebar-accent"
        >
          <Link to={to} onClick={() => setSidebarOpen(false)}>
            <Icon className="size-5 shrink-0 opacity-80" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="space-y-1 pb-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-lg tracking-tight">Dashboard</h2>
        {user && (
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
      {nav}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full justify-start gap-3 rounded-lg"
      >
        <LogOut className="size-5 shrink-0" />
        Logout
      </Button>
    </>
  );

  return (
    <div className="min-h-svh flex bg-background">
      <aside className="hidden md:flex w-60 border-r border-sidebar-border bg-sidebar flex-col p-5 gap-4 shrink-0">
        {sidebarContent}
      </aside>
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar flex flex-col p-5 gap-4 md:hidden shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-2 p-3 border-b border-border bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] rounded-lg"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold">Dashboard</span>
        </header>
        <main className="flex-1 p-5 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
