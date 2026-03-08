import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, BarChart3, Settings, Menu, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const adminNavigation = [
  { name: "Manajemen User", href: "/users", icon: Users },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

function AppSidebar() {
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const isCollapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  
  return (
    <Sidebar 
      className="border-r border-sidebar-border" 
      collapsible="offcanvas"
    >
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-4 md:p-6">
          {!isCollapsed && (
            <div className="flex flex-col items-center text-center">
              <img
                src="/icon/logos-white.svg"
                alt="Logo GiziX"
                className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
              />
              <p className="text-xs text-sidebar-foreground/70 mt-1">
                UPT Puskesmas Pulau Gadang
              </p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-4 md:px-6">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-4 md:px-6 py-3 transition-all duration-300",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm md:text-base">{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Menu - Only show for admins */}
        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 px-4 md:px-6">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.href}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-3 px-4 md:px-6 py-3 transition-all duration-300",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-sm md:text-base">{item.name}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User info and logout */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {!isCollapsed && user && (
            <div className="mb-3">
              <p className="text-xs text-sidebar-foreground/60">Masuk sebagai</p>
              <p className="text-sm text-sidebar-foreground truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Keluar</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [now, setNow] = useState(new Date());
useEffect(() => {
  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

const formattedDate = now.toLocaleDateString("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

  return (
    
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 md:h-16 border-b bg-card flex items-center px-3 md:px-6 sticky top-0 z-10 shadow-sm">
            <SidebarTrigger className="mr-2 md:mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <h1 className="text-sm md:text-base lg:text-xl font-heading font-semibold text-foreground truncate">
                {formattedDate}
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] md:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden">
            <div className="w-full max-w-[100vw] md:max-w-full mx-auto">
              {children}
            </div>
          </main>
          <footer className="border-t bg-card py-3 md:py-4 px-4 md:px-6">
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} UPT Puskesmas Pulau Gadang. Build & Design by Rossa Gusti Yolanda, S.Gz
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
