"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTenantDashboard } from "@/hooks/use-tenant-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";

export default function TenantPage() {
    const params = useParams<{ id: string }>();
    const tenantId = params?.id;
    const { data, isLoading, isError, error } = useTenantDashboard(tenantId);

    const chartConfig = useMemo<ChartConfig>(
        () => ({
            total: { label: "Total", color: "var(--chart-1)" },
            success: { label: "Success", color: "var(--chart-2)" },
            failure: { label: "Failure", color: "var(--chart-3)" },
        }),
        []
    );

    if (isLoading) return <div className="p-6">Loading tenant dashboard...</div>;
    if (isError) return <div className="p-6 text-red-600">{(error as Error)?.message || "Failed to load"}</div>;
    if (!data) return null;

    const series = (data.history.metrics7d.series || []).map((d) => ({
        day: new Date(d.day).toLocaleDateString(),
        total: d.total,
        success: d.success,
        failure: d.failure,
    }));

    return (
        <div className="space-y-6 p-2 sm:p-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold">{data.tenant.name}</h1>
                    <p className="text-sm text-muted-foreground">Tenant ID: {data.tenant.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant={data.connection.postgresql ? "default" : "destructive"}>Postgres: {data.connection.postgresql ? 'Connected' : 'Down'}</Badge>
                    <Badge variant={data.connection.redis ? "default" : "destructive"}>Redis: {data.connection.redis ? 'Connected' : 'Down'}</Badge>
                    <Badge variant="secondary">DB: {data.database.dbName}</Badge>
                </div>
            </div>

            {/* Connection strings */}
            <Card>
                <CardHeader>
                    <CardTitle>Connection</CardTitle>
                    <CardDescription>Real connection strings for this tenant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <div className="text-xs text-muted-foreground">Masked</div>
                        <div className="font-mono text-sm break-all">{data.connectionStrings.masked}</div>
                    </div>
                    <Separator />
                    <div>
                        <div className="text-xs text-muted-foreground">Full</div>
                        <div className="font-mono text-sm break-all">{data.connectionStrings.postgres}</div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Database Size</CardTitle>
                        <CardDescription>Total size of tenant database</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{data.database.sizePretty}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tables</CardTitle>
                        <CardDescription>Count of public tables</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{data.database.totalTables}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Total Rows</CardTitle>
                        <CardDescription>Approximate rows across tables</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{data.database.totalRows.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Active Connections</CardTitle>
                        <CardDescription>Current connections to DB</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold">{data.database.activeConnections}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Query Activity (7d)</CardTitle>
                        <CardDescription>Total vs Success vs Failure</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={series}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                                    <Bar dataKey="success" fill="var(--color-success)" radius={4} />
                                    <Bar dataKey="failure" fill="var(--color-failure)" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Tables by Size</CardTitle>
                        <CardDescription>Largest relations in tenant DB</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.database.topTables.length === 0 && (
                            <div className="text-sm text-muted-foreground">No tables found</div>
                        )}
                        {data.database.topTables.map((t) => (
                            <div key={t.tableName} className="flex items-center justify-between">
                                <div className="font-medium">{t.tableName}</div>
                                <div className="text-sm text-muted-foreground">{t.sizePretty}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Latest queries and logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Latest Queries</CardTitle>
                        <CardDescription>Recent executions saved to history</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.history.latest.length === 0 && (
                            <div className="text-sm text-muted-foreground">No history yet.</div>
                        )}
                        {data.history.latest.map((q) => (
                            <div key={q.id} className="space-y-1">
                                <div className={`text-xs font-mono break-all ${q.success ? 'text-foreground' : 'text-red-600'}`}>{q.query_text}</div>
                                <div className="text-xs text-muted-foreground flex gap-2">
                                    <span>{new Date(q.execution_timestamp).toLocaleString()}</span>
                                    <span>• {q.execution_time_ms} ms</span>
                                    <span>• {q.rows_affected} rows</span>
                                    <span>• {q.success ? 'success' : 'error'}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Logs</CardTitle>
                        <CardDescription>System events for this tenant</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.logs.length === 0 && (
                            <div className="text-sm text-muted-foreground">No logs.</div>
                        )}
                        {data.logs.map((l) => (
                            <div key={l.id} className="space-y-1">
                                <div className="text-sm font-medium">[{l.level}] {l.message}</div>
                                <div className="text-xs text-muted-foreground">{new Date(l.timestamp).toLocaleString()} • {l.source || 'System'}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
