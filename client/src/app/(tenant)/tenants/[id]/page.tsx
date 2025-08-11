"use client";

import { useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { useTenantDashboard } from "@/hooks/use-tenant-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TenantPage() {
    const params = useParams<{ id: string }>();
    const tenantId = params?.id;
    const { data, isLoading, isError, error } = useTenantDashboard(tenantId);
    
    const queriesScrollRef = useRef<HTMLDivElement>(null);
    const logsScrollRef = useRef<HTMLDivElement>(null);

    const chartConfig = useMemo<ChartConfig>(
        () => ({
            total: { label: "Total", color: "var(--chart-1)" },
            success: { label: "Success", color: "var(--chart-2)" },
            failure: { label: "Failure", color: "var(--chart-3)" },
        }),
        []
    );

    // Auto scroll to bottom when data changes
    useEffect(() => {
        if (data?.history?.latest && queriesScrollRef.current) {
            const scrollElement = queriesScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTo({
                    top: scrollElement.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }987
    }, [data?.history?.latest]);

    useEffect(() => {
        if (data?.logs && logsScrollRef.current) {
            const scrollElement = logsScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTo({
                    top: scrollElement.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [data?.logs]);

    const getLogLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'info':
                return 'text-blue-400';
            case 'warning':
                return 'text-yellow-400';
            case 'error':
                return 'text-red-400';
            case 'success':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    const getLogLevelIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'info':
                return <Info className="h-3 w-3 shrink-0 text-blue-400" />;
            case 'warning':
                return <AlertCircle className="h-3 w-3 shrink-0 text-yellow-400" />;
            case 'error':
                return <AlertCircle className="h-3 w-3 shrink-0 text-red-400" />;
            case 'success':
                return <CheckCircle className="h-3 w-3 shrink-0 text-green-400" />;
            default:
                return <Info className="h-3 w-3 shrink-0 text-gray-400" />;
        }
    };

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
                        <ScrollArea ref={queriesScrollRef} className="w-full h-60">
                            {data.history.latest.map((q) => (
                                <div key={q.id} className="space-y-0.5 hover:bg-muted/50 p-2 rounded-sm">
                                    <div className={`text-xs font-mono break-all ${q.success ? 'text-foreground' : 'text-red-600'}`}>{q.query_text.slice(0, 250)} {q.query_text.length > 250 && '......'}</div>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{new Date(q.execution_timestamp).toLocaleString()}</span>
                                        <span>• {q.execution_time_ms} ms</span>
                                        <span>• {q.rows_affected} rows</span>
                                        <span>• {q.success ? 'success' : 'error'}</span>
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>
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
                        <ScrollArea ref={logsScrollRef} className="w-full h-60">
                            <div className="space-y-2 p-2">
                                {data.logs.map((l) => (
                                    <div key={l.id} className="flex items-start space-x-3 p-2 rounded-sm hover:bg-muted/50">
                                        <div className="flex items-center space-x-2 flex-shrink-0 w-18">
                                            {getLogLevelIcon(l.level)}
                                            <span className={`text-xs font-medium ${getLogLevelColor(l.level)}`}>
                                                {l.level.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium break-words">{l.message}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {new Date(l.timestamp).toLocaleString()} • {l.source || 'System'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
