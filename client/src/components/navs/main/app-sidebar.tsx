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
      <SidebarHeader className="flex flex-row w-full justify-between items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
            T
          </div>
          <span className="text-lg font-semibold text-foreground">
            Tenanta
          </span>
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
