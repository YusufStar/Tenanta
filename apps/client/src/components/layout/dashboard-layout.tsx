'use client';

import { usePathname } from 'next/navigation';
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Add home breadcrumb
    breadcrumbs.push({
      title: 'Tenanta Platform',
      href: '/',
      isCurrent: segments.length === 0,
    });

    // Add path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      // Capitalize and format segment name
      const title = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        title,
        href: currentPath,
        isCurrent: isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <SidebarProvider suppressHydrationWarning>
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
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center">
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                    <BreadcrumbItem className="hidden md:block">
                      {breadcrumb.isCurrent ? (
                        <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={breadcrumb.href}>
                          {breadcrumb.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-col gap-4 p-4 h-full min-h-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 