import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Database, BarChart3, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
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
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-6">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-heading font-bold text-white">
                  Dashboard Gizi
                </h2>
                <p className="text-xs text-sidebar-foreground/70 mt-1">
                  UPT Puskesmas Pulau Gadang
                </p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-6">
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
                        className={cn(
                          "flex items-center gap-3 px-6 py-3 transition-all duration-200",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 md:h-16 border-b bg-card flex items-center px-3 md:px-6 sticky top-0 z-10 shadow-sm">
            <SidebarTrigger className="mr-2 md:mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm md:text-xl font-heading font-semibold text-foreground truncate">
                Dashboard Status Gizi Balita
              </h1>
            </div>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
            <div className="max-w-full mx-auto">
              {children}
            </div>
          </main>
          <footer className="border-t bg-card py-4 px-6">
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} UPT Puskesmas Pulau Gadang. Built & Design by Rossa Gusti Yolanda, S.Gz
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
