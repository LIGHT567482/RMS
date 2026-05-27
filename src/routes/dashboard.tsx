import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, getSchool } from "@/lib/storage";
import { useTheme } from "@/routes/__root";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/marks", label: "Enter Marks", icon: ClipboardList },
  { to: "/dashboard/project-work", label: "Project Work", icon: Sparkles },
  { to: "/dashboard/continuous-assessment", label: "Continuous Assessment", icon: GraduationCap },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const school = useStore(getSchool);

  useEffect(() => {
    if (!auth.isAuthenticated) navigate({ to: "/" });
  }, [auth.isAuthenticated, navigate]);

  if (!auth.isAuthenticated) return null;

  const { theme, toggleTheme } = useTheme();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <div className="px-4 py-5 flex items-center gap-3 border-b border-sidebar-border">
              <div
                className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: school.logoDataUrl ? "transparent" : "var(--gradient-gold)" }}
              >
                {school.logoDataUrl ? (
                  <img
                    src={school.logoDataUrl}
                    alt="School logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.05_60)]">
                    {school.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                )}
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="font-display text-sm text-sidebar-foreground truncate">
                  {school.name}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 tracking-wider">
                  REPORT CARD SYSTEM
                </p>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => {
                    const active = item.exact ? path === item.to : path.startsWith(item.to);
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.to} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-3 border-t border-sidebar-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => {
                  auth.signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center gap-3 px-4 no-print bg-card">
            <SidebarTrigger />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              FOR STAFF USE ONLY
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span>{school.motto}</span>
              <Button
                size="icon"
                variant="ghost"
                type="button"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={toggleTheme}
                className="bg-card text-card-foreground shadow-lg border border-border hover:opacity-90"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
