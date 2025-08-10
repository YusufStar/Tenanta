'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Database,
  Terminal,
} from 'lucide-react';

import { NavMain } from '@/components/navs/tenant/tenant-nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ModeToggle } from '../../ui/mode-toggle';

export function TenantSidebar({ tenantId, ...props }: React.ComponentProps<typeof Sidebar> & { tenantId: string }) {
  const pathname = usePathname();

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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row w-full justify-between items-center gap-2">
        <span className="text-lg font-medium">
          Tenanta
        </span>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
