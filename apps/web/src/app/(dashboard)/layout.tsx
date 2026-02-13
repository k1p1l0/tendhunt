import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import { AgentProvider } from "@/components/agent/agent-provider";
import { AgentPanel } from "@/components/agent/agent-panel";
import { FloatingBubble } from "@/components/sculptor/floating-bubble";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <BreadcrumbProvider>
          <AgentProvider>
            <Header />
            <main className="flex-1 p-6">{children}</main>
            <AgentPanel />
            <FloatingBubble />
          </AgentProvider>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
