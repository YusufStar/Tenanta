export default async function SchemasPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    return <div>Schemas for tenant {id}</div>;
}