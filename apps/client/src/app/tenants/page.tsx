'use client';

import { TenantsDataTable } from '@/components/tenants/tenants-data-table';
import { useTenants } from '@/hooks/use-tenants';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function TenantsPage() {
  const { tenants, pagination, loading, error, refetch } = useTenants({
    page: 1,
    limit: 50,
    autoRefresh: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  // Transform tenant data to match the table interface
  const transformedTenants = tenants.map(tenant => ({
    ...tenant,
    createdAt: new Date(tenant.createdAt),
    updatedAt: new Date(tenant.updatedAt)
  }));

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage and monitor all tenant organizations
          </p>
          {pagination && (
            <p className="text-sm text-muted-foreground mt-1">
              {pagination.total} tenant{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button> 
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            Failed to load tenants: {error}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tenants...</span>
        </div>
      )}
      
      {/* Data Table */}
      {!loading && !error && (
        <TenantsDataTable 
          data={transformedTenants} 
          onRefresh={refetch}
          pagination={pagination}
        />
      )}
    </>
  );
} 