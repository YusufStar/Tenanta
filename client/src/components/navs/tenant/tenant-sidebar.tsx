'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Database,
  Terminal,
  ArrowLeft,
} from 'lucide-react';

import { NavMain } from '@/components/navs/tenant/tenant-nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '../../ui/mode-toggle';

export function TenantSidebar({ tenantId, ...props }: React.ComponentProps<typeof Sidebar> & { tenantId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  // Simplified navigation data - only basic pages
  const data = {
    navMain: [
      {
        title: 'Tenant Dashboard',
        url: `/tenants/${tenantId}`,
        icon: BarChart3,
        isActive: pathname === `/tenants/${tenantId}`,
      },
      {
        title: 'Sql Editor',
        url: `/tenants/${tenantId}/sql-editor`,
        icon: Terminal,
        isActive: pathname === `/tenants/${tenantId}/sql-editor`,
      },
      {
        title: 'Schemas',
        url: `/tenants/${tenantId}/schemas`,
        icon: Database,
        isActive: pathname === `/tenants/${tenantId}/schemas`,
      },
    ]
  };

  const handleGoBack = () => {
    router.push('/tenants');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row w-full justify-between items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="h-8 w-8 hover:bg-muted"
            title="Back to Tenants"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            Tenant
          </div>
        </div>
        <ModeToggle />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
