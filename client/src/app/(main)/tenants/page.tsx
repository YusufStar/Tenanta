'use client';

import { TenantsDataTable } from '@/components/dashboard/tenants/tenants-data-table';
import { TenantCreateModal } from '@/components/dashboard/tenants/tenant-create-modal';
import { useTenants } from '@/hooks/use-tenants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function TenantsPage() {
  const { data, isLoading, error, refetch } = useTenants({
    page: 1,
    limit: 50,
    autoRefresh: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  // Transform tenant data to match the table interface
  const transformedTenants = data?.tenants?.map(tenant => ({
    ...tenant,
    createdAt: new Date(tenant.createdAt),
    updatedAt: new Date(tenant.updatedAt)
  })) || [];

  const handleCreateSuccess = () => {
    // Refresh the tenants data after successful creation
    refetch();
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage and monitor all tenant organizations
          </p>
          {data?.pagination && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.pagination.total} tenant{data.pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <TenantCreateModal onSuccess={handleCreateSuccess} />
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Failed to load tenants: {error.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tenants...</span>
        </div>
      )}
      
      {/* Data Table */}
      {!isLoading && !error && (
        <TenantsDataTable 
          data={transformedTenants} 
          onRefresh={handleRefresh}
          pagination={data?.pagination}
        />
      )}
    </>
  );
} 