'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus } from 'lucide-react';
import { useCreateTenant } from '@/hooks/use-tenants';
import { CreateTenantRequest } from '@/hooks/use-tenants';

interface TenantCreateModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function TenantCreateModal({ onSuccess, trigger }: TenantCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    slug: '',
    schemaName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createTenant, isPending, error, reset } = useCreateTenant();

  // Auto-generate slug and schema name when name changes
  useEffect(() => {
    if (formData.name.trim()) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const schemaName = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .trim();

      setFormData(prev => ({
        ...prev,
        slug: slug || '',
        schemaName: schemaName || ''
      }));
    }
  }, [formData.name]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less';
    }

    // Validate slug
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Slug must be 100 characters or less';
    }

    // Validate schema name
    if (!formData.schemaName.trim()) {
      newErrors.schemaName = 'Schema name is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.schemaName)) {
      newErrors.schemaName = 'Schema name must contain only lowercase letters, numbers, and underscores';
    } else if (formData.schemaName.length > 63) {
      newErrors.schemaName = 'Schema name must be 63 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createTenant(formData, {
      onSuccess: () => {
        setOpen(false);
        reset();
        setFormData({ name: '', slug: '', schemaName: '' });
        setErrors({});
        onSuccess?.();
      },
      onError: (error) => {
        console.error('Failed to create tenant:', error);
      }
    });
  };

  const handleInputChange = (field: keyof CreateTenantRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      setFormData({ name: '', slug: '', schemaName: '' });
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Create a new tenant organization. Enter the tenant name and slug/schema will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter tenant name"
              disabled={isPending}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Slug Field */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="tenant-slug"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from name. You can edit if needed.
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
          </div>

          {/* Schema Name Field */}
          <div className="space-y-2">
            <Label htmlFor="schemaName">Schema Name *</Label>
            <Input
              id="schemaName"
              value={formData.schemaName}
              onChange={(e) => handleInputChange('schemaName', e.target.value)}
              placeholder="tenant_schema"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from name. You can edit if needed.
            </p>
            {errors.schemaName && (
              <p className="text-sm text-destructive">{errors.schemaName}</p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
