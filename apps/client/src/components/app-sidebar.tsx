'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Database,
  Settings2,
  BookOpen,
  Terminal,
  BarChart3,
  Users,
  Shield,
  Activity,
  FileText,
  FolderOpen,
  GitBranch,
  Zap,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ModeToggle } from './ui/mode-toggle';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Tenanta project navigation data with active state logic
  const data = {
    navMain: [
      {
        title: 'Overview',
        url: '/',
        icon: BarChart3,
        isActive: pathname === '/' || pathname.startsWith('/analytics') || pathname.startsWith('/activity'),
        items: [
          {
            title: 'Dashboard',
            url: '/',
            isActive: pathname === '/',
          },
          {
            title: 'Analytics',
            url: '/analytics',
            isActive: pathname.startsWith('/analytics'),
          },
          {
            title: 'Activity',
            url: '/activity',
            isActive: pathname.startsWith('/activity'),
          },
        ],
      },
      {
        title: 'Tenants',
        url: '/tenants',
        icon: Users,
        isActive: pathname.startsWith('/tenants'),
        items: [
          {
            title: 'All Tenants',
            url: '/tenants',
            isActive: pathname === '/tenants',
          },
          {
            title: 'Create Tenant',
            url: '/tenants/create',
            isActive: pathname === '/tenants/create',
          },
          {
            title: 'Tenant Settings',
            url: '/tenants/settings',
            isActive: pathname.startsWith('/tenants/settings'),
          },
        ],
      },
      {
        title: 'Schemas',
        url: '/schemas',
        icon: Database,
        isActive: pathname.startsWith('/schemas'),
        items: [
          {
            title: 'All Schemas',
            url: '/schemas',
            isActive: pathname === '/schemas',
          },
          {
            title: 'Create Schema',
            url: '/schemas/create',
            isActive: pathname === '/schemas/create',
          },
          {
            title: 'Schema Templates',
            url: '/schemas/templates',
            isActive: pathname === '/schemas/templates',
          },
          {
            title: 'Migrations',
            url: '/schemas/migrations',
            isActive: pathname.startsWith('/schemas/migrations'),
          },
        ],
      },
      {
        title: 'Database Console',
        url: '/console',
        icon: Terminal,
        isActive: pathname.startsWith('/console'),
        items: [
          {
            title: 'SQL Console',
            url: '/console/sql',
            isActive: pathname === '/console/sql',
          },
          {
            title: 'Redis Console',
            url: '/console/redis',
            isActive: pathname === '/console/redis',
          },
          {
            title: 'Query History',
            url: '/console/history',
            isActive: pathname === '/console/history',
          },
          {
            title: 'Saved Queries',
            url: '/console/saved',
            isActive: pathname === '/console/saved',
          },
        ],
      },
      {
        title: 'Data Management',
        url: '/data',
        icon: FileText,
        isActive: pathname.startsWith('/data'),
        items: [
          {
            title: 'Browse Data',
            url: '/data/browse',
            isActive: pathname === '/data/browse',
          },
          {
            title: 'Import Data',
            url: '/data/import',
            isActive: pathname === '/data/import',
          },
          {
            title: 'Export Data',
            url: '/data/export',
            isActive: pathname === '/data/export',
          },
          {
            title: 'Data Validation',
            url: '/data/validation',
            isActive: pathname === '/data/validation',
          },
        ],
      },
      {
        title: 'Security',
        url: '/security',
        icon: Shield,
        isActive: pathname.startsWith('/security'),
        items: [
          {
            title: 'Access Control',
            url: '/security/access',
            isActive: pathname === '/security/access',
          },
          {
            title: 'Audit Logs',
            url: '/security/audit',
            isActive: pathname === '/security/audit',
          },
          {
            title: 'API Keys',
            url: '/security/api-keys',
            isActive: pathname === '/security/api-keys',
          },
          {
            title: 'Permissions',
            url: '/security/permissions',
            isActive: pathname === '/security/permissions',
          },
        ],
      },
      {
        title: 'Monitoring',
        url: '/monitoring',
        icon: Activity,
        isActive: pathname.startsWith('/monitoring'),
        items: [
          {
            title: 'System Health',
            url: '/monitoring/health',
            isActive: pathname === '/monitoring/health',
          },
          {
            title: 'Performance',
            url: '/monitoring/performance',
            isActive: pathname === '/monitoring/performance',
          },
          {
            title: 'Logs',
            url: '/monitoring/logs',
            isActive: pathname === '/monitoring/logs',
          },
          {
            title: 'Alerts',
            url: '/monitoring/alerts',
            isActive: pathname === '/monitoring/alerts',
          },
        ],
      },
      {
        title: 'Documentation',
        url: '/docs',
        icon: BookOpen,
        isActive: pathname.startsWith('/docs'),
        items: [
          {
            title: 'API Reference',
            url: '/docs/api',
            isActive: pathname === '/docs/api',
          },
          {
            title: 'Getting Started',
            url: '/docs/getting-started',
            isActive: pathname === '/docs/getting-started',
          },
          {
            title: 'Tutorials',
            url: '/docs/tutorials',
            isActive: pathname === '/docs/tutorials',
          },
          {
            title: 'Changelog',
            url: '/docs/changelog',
            isActive: pathname === '/docs/changelog',
          },
        ],
      },
      {
        title: 'Settings',
        url: '/settings',
        icon: Settings2,
        isActive: pathname.startsWith('/settings'),
        items: [
          {
            title: 'General',
            url: '/settings/general',
            isActive: pathname === '/settings/general',
          },
          {
            title: 'Database',
            url: '/settings/database',
            isActive: pathname === '/settings/database',
          },
          {
            title: 'Redis',
            url: '/settings/redis',
            isActive: pathname === '/settings/redis',
          },
          {
            title: 'Advanced',
            url: '/settings/advanced',
            isActive: pathname === '/settings/advanced',
          },
        ],
      },
    ],
    projects: [
      {
        name: 'Development',
        url: '/projects/dev',
        icon: GitBranch,
        isActive: pathname === '/projects/dev',
      },
      {
        name: 'Production',
        url: '/projects/prod',
        icon: Zap,
        isActive: pathname === '/projects/prod',
      },
      {
        name: 'Staging',
        url: '/projects/staging',
        icon: FolderOpen,
        isActive: pathname === '/projects/staging',
      },
    ],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row w-full justify-between items-center gap-2">
        <span className="text-lg font-medium">
          Tenanta Database
        </span>

        <ModeToggle />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
