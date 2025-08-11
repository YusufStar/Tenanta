"use client"

import { useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
    Play,
    Copy,
    Download,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Database,
    Clock,
    Activity,
    Check
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useExecuteQuery, useDatabaseStatus, useQueryHistory } from "@/hooks/use-sql-editor";
import { subHours, subDays, isAfter } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QueryResult {
    id: string;
    query: string;
    timestamp: Date;
    executionTime: number;
    rowsAffected: number;
    success: boolean;
    error?: string;
    data?: any[];
    columns?: string[];
}
export default function SQLEditor() {
    const tenantId = useParams().id as string;

    const [query, setQuery] = useState(`-- Welcome to SQL Editor`);

    const [isExecuting, setIsExecuting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
    const [activeTab, setActiveTab] = useState("results");
    
    // History filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<string>("all");

    const editorRef = useRef<any>(null);

    // API hooks
    const executeQueryMutation = useExecuteQuery(tenantId);
    const { data: databaseStatus } = useDatabaseStatus(tenantId);
    const { data: queryHistoryData, refetch: refetchHistory } = useQueryHistory(
        tenantId,
        { page: 1, limit: 50 }
    );

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // Custom theme for SQL editor
        monaco.editor.defineTheme('sql-editor-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'operator', foreground: 'D4D4D4' },
                { token: 'delimiter', foreground: 'D4D4D4' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editor.selectionBackground': '#264f78',
                'editor.inactiveSelectionBackground': '#3a3d41',
                'editorIndentGuide.background': '#404040',
                'editorIndentGuide.activeBackground': '#707070',
                'editor.wordHighlightBackground': '#575757',
                'editor.wordHighlightStrongBackground': '#004972',
            }
        });

        monaco.editor.setTheme('sql-editor-theme');

        // Add keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            executeQuery();
        });

        editor.addCommand(monaco.KeyCode.F5, () => {
            executeQuery();
        });
    };

    const executeQuery = useCallback(async () => {
        if (!query.trim() || isExecuting) return;

        setIsExecuting(true);
        const startTime = Date.now();

        try {
            // Execute the query using the API
            const result = await executeQueryMutation.mutateAsync({ query: query.trim() });

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            const queryResult: QueryResult = {
                id: `query_${Date.now()}`,
                query: query.trim(),
                timestamp: new Date(),
                executionTime: result.executionTime || executionTime,
                rowsAffected: result.rowsAffected,
                success: result.success,
                data: result.data,
                columns: result.columns,
                error: result.error
            };

            // Add to results
            setQueryResults(prev => [queryResult, ...prev.slice(0, 9)]); // Keep last 10 results

            setActiveTab("results");

            // Refetch history to get updated data from server
            if (activeTab === "history") {
                refetchHistory();
            }

            if (result.success) {
                toast.success(`Query executed successfully in ${result.executionTime}ms`);
            } else {
                toast.error(`Query failed: ${result.error}`);
            }

        } catch (error) {
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            const queryResult: QueryResult = {
                id: `query_${Date.now()}`,
                query: query.trim(),
                timestamp: new Date(),
                executionTime,
                rowsAffected: 0,
                success: false,
                error: errorMessage
            };

            setQueryResults(prev => [queryResult, ...prev.slice(0, 9)]);

            setActiveTab("results");

            // Refetch history to get updated data from server
            if (activeTab === "history") {
                refetchHistory();
            }

            toast.error(`Query failed: ${errorMessage}`);

        } finally {
            setIsExecuting(false);
        }
    }, [query, isExecuting, executeQueryMutation, activeTab, refetchHistory]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(query);
            setIsCopied(true);
            toast.success("Query copied to clipboard");

            // Reset back to copy icon after 2 seconds
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy query:', error);
            toast.error("Failed to copy query");
        }
    };

    const handleDownload = () => {
        const blob = new Blob([query], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Query downloaded");
    };

    const handleClear = () => {
        setQuery('-- New SQL query\n\n');
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const loadHistoryQuery = (historyQuery: string) => {
        setQuery(historyQuery);
        if (editorRef.current) {
            editorRef.current.focus();
        }
        toast.success("Query loaded from history");
    };

    const formatTimestamp = (timestamp: Date) => {
        return timestamp.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const filterHistoryData = () => {
        if (!queryHistoryData?.data) return [];
        
        let filteredData = [...queryHistoryData.data];
        
        // Status filter
        if (statusFilter !== "all") {
            filteredData = filteredData.filter(item => {
                if (statusFilter === "success") return item.success;
                if (statusFilter === "error") return !item.success;
                return true;
            });
        }
        
        // Time filter using date-fns
        if (timeFilter !== "all") {
            const now = new Date();
            let filterDate: Date;
            
            switch (timeFilter) {
                case "1hour":
                    filterDate = subHours(now, 1);
                    break;
                case "1day":
                    filterDate = subDays(now, 1);
                    break;
                case "7days":
                    filterDate = subDays(now, 7);
                    break;
                case "30days":
                    filterDate = subDays(now, 30);
                    break;
                default:
                    return filteredData;
            }
            
            filteredData = filteredData.filter(item => 
                isAfter(new Date(item.execution_timestamp), filterDate)
            );
        }
        
        return filteredData;
    };

    return (
        <main className="h-full w-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-semibold">SQL Editor</h1>
                    <Badge variant="outline" className="text-xs">
                        Tenant: {tenantId.slice(0, 8)}...
                    </Badge>
                    {databaseStatus && (
                        <Badge
                            variant={databaseStatus.status === 'connected' ? 'default' : 'destructive'}
                            className="text-xs"
                        >
                            {databaseStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
                        </Badge>
                    )}
                </div>

                <nav className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={executeQuery}
                        disabled={isExecuting || !query.trim()}
                        className="gap-2"
                    >
                        {isExecuting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {isExecuting ? 'Executing...' : 'Execute'}
                    </Button>

                    <Separator orientation="vertical" className="h-6" />

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        className="gap-2"
                        title="Copy query (Ctrl+C)"
                    >
                        {isCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDownload}
                        className="gap-2"
                        title="Download query"
                    >
                        <Download className="h-4 w-4" />
                    </Button>

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClear}
                        className="gap-2"
                        title="Clear editor"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </nav>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex min-h-0">
                {/* SQL Editor */}
                <section className="flex-1 flex flex-col border-r border-border">
                    <div className="p-2 border-b border-border">
                        <p className="text-sm text-muted-foreground">
                            Write your SQL queries here. Use <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd> or <kbd className="px-1 py-0.5 text-xs bg-muted rounded">F5</kbd> to execute.
                        </p>
                    </div>

                    <div className="flex-1">
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            value={query}
                            onChange={(value) => setQuery(value || '')}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 14,
                                fontFamily: 'JetBrains Mono, Consolas, "Cascadia Code", monospace',
                                lineNumbers: 'on',
                                roundedSelection: false,
                                scrollbar: {
                                    vertical: 'visible',
                                    horizontal: 'visible',
                                    verticalScrollbarSize: 12,
                                    horizontalScrollbarSize: 12,
                                },
                                wordWrap: 'on',
                                automaticLayout: true,
                                tabSize: 2,
                                insertSpaces: true,
                                folding: true,
                                foldingStrategy: 'indentation',
                                lineDecorationsWidth: 5,
                                lineNumbersMinChars: 3,
                                renderLineHighlight: 'line',
                                selectionHighlight: false,
                                bracketPairColorization: {
                                    enabled: true,
                                },
                                suggest: {
                                    showKeywords: true,
                                    showSnippets: true,
                                    showWords: true,
                                },
                                quickSuggestions: {
                                    other: true,
                                    comments: false,
                                    strings: false
                                },
                                contextmenu: true,
                                mouseWheelZoom: true,
                            }}
                        />
                    </div>
                </section>

                {/* Results Panel */}
                <section className="w-[400px] flex flex-col overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="w-full justify-start h-auto p-0 flex-shrink-0">
                            <TabsTrigger value="results" className="gap-2">
                                <Activity className="h-4 w-4" />
                                Results
                                {queryResults.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {queryResults.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="history" className="gap-2">
                                <Clock className="h-4 w-4" />
                                History
                                {queryHistoryData?.data && queryHistoryData.data.length > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {queryHistoryData.data.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="results" className="flex-1 m-0 overflow-hidden">
                            <ScrollArea className="h-full">
                                {queryResults.length === 0 ? (
                                    <div className="flex items-center justify-center h-full p-8">
                                        <div className="text-center">
                                            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-lg font-medium mb-2">No query results</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Execute a SQL query to see results here
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {queryResults.map((result) => (
                                            <div key={result.id} className="border border-border rounded-lg overflow-hidden">
                                                <div className="bg-muted/50 p-3 border-b border-border">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {result.success ? (
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                                            )}
                                                            <span className="text-sm font-medium">
                                                                {result.success ? 'Success' : 'Error'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span>{formatTimestamp(result.timestamp)}</span>
                                                            <span>{formatDuration(result.executionTime)}</span>
                                                            <span>{result.rowsAffected} rows</span>
                                                        </div>
                                                    </div>
                                                    <code className="text-xs text-muted-foreground break-all">
                                                        {result.query.length > 100
                                                            ? `${result.query.slice(0, 100)}...`
                                                            : result.query
                                                        }
                                                    </code>
                                                </div>

                                                {result.success ? (
                                                    result.data && result.data.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-muted/30">
                                                                    <tr>
                                                                        {result.columns?.map((column) => (
                                                                            <th key={column} className="text-left p-3 font-medium">
                                                                                {column}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {result.data.map((row, index) => (
                                                                        <tr key={index} className="border-t border-border">
                                                                            {result.columns?.map((column) => (
                                                                                <td key={column} className="p-3">
                                                                                    {row[column]?.toString() || ''}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 text-center text-muted-foreground">
                                                            Query executed successfully but returned no data
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="p-4">
                                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                                                            <p className="text-sm text-red-700 dark:text-red-400">
                                                                {result.error}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
                            <div className="flex flex-col h-full">
                                {/* Filter Controls */}
                                <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="text-xs font-medium text-muted-foreground">Status:</label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="success">Success</SelectItem>
                                                <SelectItem value="error">Error</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="text-xs font-medium text-muted-foreground">Time:</label>
                                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                                            <SelectTrigger className="w-full h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="1hour">Last 1 hour</SelectItem>
                                                <SelectItem value="1day">Last 1 day</SelectItem>
                                                <SelectItem value="7days">Last 7 days</SelectItem>
                                                <SelectItem value="30days">Last 30 days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* History List */}
                                <div className="flex-1 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        {(() => {
                                            const filteredData = filterHistoryData();
                                            
                                            if (filteredData.length === 0) {
                                                return (
                                                    <div className="flex items-center justify-center h-full p-8">
                                                        <div className="text-center">
                                                            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                            <h3 className="text-lg font-medium mb-2">No query history</h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                {!queryHistoryData?.data || queryHistoryData.data.length === 0
                                                                    ? "Your executed queries will appear here"
                                                                    : "No queries match the current filters"
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div className="p-4 space-y-2">
                                                    {filteredData.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="border border-border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                                            onClick={() => loadHistoryQuery(item.query_text)}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    {item.success ? (
                                                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                                                    ) : (
                                                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                                                    )}
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {new Date(item.execution_timestamp).toLocaleTimeString('en-US', {
                                                                            hour12: false,
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            second: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-3 text-xs text-muted-foreground">
                                                                    <span>{formatDuration(item.execution_time_ms)}</span>
                                                                    <span>{item.rows_affected} rows</span>
                                                                </div>
                                                            </div>
                                                            <code className="text-xs break-all">
                                                                {item.query_text.length > 100
                                                                    ? `${item.query_text.slice(0, 100)}...`
                                                                    : item.query_text
                                                                }
                                                            </code>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </ScrollArea>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
            </div>
        </main>
    );
}