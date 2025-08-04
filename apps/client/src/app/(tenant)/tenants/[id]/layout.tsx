import { TenantLayout } from "@/components/navs/tenant/tenant-layout";

export default async function TenantLayoutPage({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TenantLayout tenantId={id}>{children}</TenantLayout>;
}