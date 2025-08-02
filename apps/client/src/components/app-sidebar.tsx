'use client';

import * as React from 'react';
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

// Tenanta project navigation data
const data = {
  navMain: [
    {
      title: 'Overview',
      url: '/',
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: 'Dashboard',
          url: '/',
        },
        {
          title: 'Analytics',
          url: '/analytics',
        },
        {
          title: 'Activity',
          url: '/activity',
        },
      ],
    },
    {
      title: 'Tenants',
      url: '/tenants',
      icon: Users,
      items: [
        {
          title: 'All Tenants',
          url: '/tenants',
        },
        {
          title: 'Create Tenant',
          url: '/tenants/create',
        },
        {
          title: 'Tenant Settings',
          url: '/tenants/settings',
        },
      ],
    },
    {
      title: 'Schemas',
      url: '/schemas',
      icon: Database,
      items: [
        {
          title: 'All Schemas',
          url: '/schemas',
        },
        {
          title: 'Create Schema',
          url: '/schemas/create',
        },
        {
          title: 'Schema Templates',
          url: '/schemas/templates',
        },
        {
          title: 'Migrations',
          url: '/schemas/migrations',
        },
      ],
    },
    {
      title: 'Database Console',
      url: '/console',
      icon: Terminal,
      items: [
        {
          title: 'SQL Console',
          url: '/console/sql',
        },
        {
          title: 'Redis Console',
          url: '/console/redis',
        },
        {
          title: 'Query History',
          url: '/console/history',
        },
        {
          title: 'Saved Queries',
          url: '/console/saved',
        },
      ],
    },
    {
      title: 'Data Management',
      url: '/data',
      icon: FileText,
      items: [
        {
          title: 'Browse Data',
          url: '/data/browse',
        },
        {
          title: 'Import Data',
          url: '/data/import',
        },
        {
          title: 'Export Data',
          url: '/data/export',
        },
        {
          title: 'Data Validation',
          url: '/data/validation',
        },
      ],
    },
    {
      title: 'Security',
      url: '/security',
      icon: Shield,
      items: [
        {
          title: 'Access Control',
          url: '/security/access',
        },
        {
          title: 'Audit Logs',
          url: '/security/audit',
        },
        {
          title: 'API Keys',
          url: '/security/api-keys',
        },
        {
          title: 'Permissions',
          url: '/security/permissions',
        },
      ],
    },
    {
      title: 'Monitoring',
      url: '/monitoring',
      icon: Activity,
      items: [
        {
          title: 'System Health',
          url: '/monitoring/health',
        },
        {
          title: 'Performance',
          url: '/monitoring/performance',
        },
        {
          title: 'Logs',
          url: '/monitoring/logs',
        },
        {
          title: 'Alerts',
          url: '/monitoring/alerts',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '/docs',
      icon: BookOpen,
      items: [
        {
          title: 'API Reference',
          url: '/docs/api',
        },
        {
          title: 'Getting Started',
          url: '/docs/getting-started',
        },
        {
          title: 'Tutorials',
          url: '/docs/tutorials',
        },
        {
          title: 'Changelog',
          url: '/docs/changelog',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/settings/general',
        },
        {
          title: 'Database',
          url: '/settings/database',
        },
        {
          title: 'Redis',
          url: '/settings/redis',
        },
        {
          title: 'Advanced',
          url: '/settings/advanced',
        },
      ],
    },
  ],
  projects: [
    {
      name: 'Development',
      url: '/projects/dev',
      icon: GitBranch,
    },
    {
      name: 'Production',
      url: '/projects/prod',
      icon: Zap,
    },
    {
      name: 'Staging',
      url: '/projects/staging',
      icon: FolderOpen,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
