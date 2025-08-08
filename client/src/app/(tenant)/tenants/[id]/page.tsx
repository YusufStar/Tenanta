export default async function TenantPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <div>Tenant {id}</div>;
}