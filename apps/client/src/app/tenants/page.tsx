import { TenantsDataTable } from '@/components/tenants/tenants-data-table';
import { mockTenantsData } from '@/lib/mock';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TenantsPage() {
  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage and monitor all tenant organizations
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button> 
      </div>
      
      {/* Data Table */}
      <TenantsDataTable data={mockTenantsData} />
    </>
  );
} 