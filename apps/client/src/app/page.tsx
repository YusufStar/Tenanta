import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { DatabaseActivityChart } from '@/components/dashboard/database-activity-chart';
import { SystemHealthCard } from '@/components/dashboard/system-health-card';
import { LogMonitorCard } from '@/components/dashboard/log-monitor-card';
import {
  mockDatabaseActivityData,
  mockSystemMetrics,
  mockLogData,
} from '@/lib/mock';

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen overflow-hidden">
        <header className="flex h-16 shrink-0 items-center transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Tenanta Platform</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-col gap-4 p-4 h-full min-h-0">
          {/* Top Row - 2 Cards */}
          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
            <DatabaseActivityChart data={mockDatabaseActivityData} />
            <SystemHealthCard metrics={mockSystemMetrics} />
          </div>
          
          {/* Bottom Row - 1 Card */}
          <div className="flex-1 min-h-0">
            <LogMonitorCard logs={mockLogData} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
