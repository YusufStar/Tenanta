'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2 } from 'lucide-react';
import { useDeleteTenant } from '@/hooks/use-tenants';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

interface TenantDeleteDialogProps {
  tenant: Tenant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TenantDeleteDialog({ 
  tenant, 
  open, 
  onOpenChange, 
  onSuccess 
}: TenantDeleteDialogProps) {
  const { mutate: deleteTenant, isPending, error, reset } = useDeleteTenant();

  const handleDelete = () => {
    deleteTenant(tenant.id, {
      onSuccess: () => {
        onOpenChange(false);
        reset();
        onSuccess?.();
      },
      onError: (error) => {
        console.error('Failed to delete tenant:', error);
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      reset();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the tenant "{tenant.name}"? This action cannot be undone.
            <br />
            <br />
            <strong>Tenant Details:</strong>
            <br />
            • Name: {tenant.name}
            <br />
            • Slug: {tenant.slug}
            <br />
            • Schema: {tenant.schemaName}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 