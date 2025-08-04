'use client';

import { TenantSidebar } from '@/components/navs/tenant/tenant-sidebar';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

interface TenantLayoutProps {
  children: React.ReactNode;
  tenantId: string;
}

export function TenantLayout({ children, tenantId }: TenantLayoutProps) {
  return (
    <SidebarProvider suppressHydrationWarning>
      <TenantSidebar tenantId={tenantId} />
      <SidebarInset className="h-screen overflow-hidden">
        <div className="flex flex-col gap-4 p-4 h-full min-h-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 