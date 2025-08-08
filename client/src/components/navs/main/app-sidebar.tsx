'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Database,
  Terminal,
  Activity,
  Settings2,
} from 'lucide-react';

import { NavMain } from '@/components/navs/main/nav-main';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ModeToggle } from '../../ui/mode-toggle';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Simplified navigation data - only basic pages
  const data = {
    navMain: [
      {
        title: 'Dashboard',
        url: '/',
        icon: BarChart3,
        isActive: pathname === '/',
      },
      {
        title: 'Tenants',
        url: '/tenants',
        icon: Users,
        isActive: pathname === '/tenants',
      }
    ]
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row w-full justify-between items-center gap-2">
        <span className="text-lg font-medium">
          Tenanta
        </span>

        <ModeToggle />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
