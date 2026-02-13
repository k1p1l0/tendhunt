"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Building2,
  Radar,
  Inbox,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAgentStore } from "@/stores/agent-store";
import type { NavItem } from "@/types";
import { SidebarCompanyHeader } from "./sidebar-company-header";
import { SidebarFooterContent } from "./sidebar-footer";

const dashboardItems: NavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Scanners",
    href: "/scanners",
    icon: Radar,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
];

const platformItems: NavItem[] = [
  {
    title: "Buyers",
    href: "/buyers",
    icon: Building2,
  },
  {
    title: "Contracts",
    href: "/contracts",
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <SidebarCompanyHeader />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => useAgentStore.getState().setPanelOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  <span>Research</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {platformItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
    </Sidebar>
  );
}
