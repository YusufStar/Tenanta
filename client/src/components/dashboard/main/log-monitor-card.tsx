'use client';

import { Terminal, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSystemLogs } from '@/hooks/use-logs';
import { LogEntry } from '@/hooks/use-logs';

interface LogMonitorCardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export function LogMonitorCard({ 
  autoRefresh = true, 
  refreshInterval = 5000,
  limit = 100 
}: LogMonitorCardProps) {
  const { data, isLoading, error, refetch } = useSystemLogs({
    limit,
    autoRefresh,
    refreshInterval
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Find the actual scrollable viewport within ScrollArea
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [data?.logs, scrollAreaRef]);

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
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

  const getLogLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="h-3 w-3 text-blue-400" />;
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      default:
        return <Info className="h-3 w-3 text-gray-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  const logs = data?.logs || [];

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4 text-green-400" />
            System Logs
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Real-time system and application logs
          {autoRefresh && ` (Auto-refresh every ${refreshInterval / 1000}s)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0">
        <div className="bg-black rounded-lg border border-gray-800 h-full min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-4 space-y-1 font-mono text-sm">
              {error ? (
                <div className="text-red-400 text-center py-4">
                  Error loading logs: {error.message}
                </div>
              ) : isLoading && logs.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  No logs available
                </div>
              ) : (
                logs.map((log: LogEntry) => (
                  <div key={log.id} className="flex items-start space-x-2">
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {getLogLevelIcon(log.level)}
                      <span className={`text-xs font-medium ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-300 flex-1">
                      {log.message}
                    </span>
                    {log.source && (
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        [{log.source}]
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
} 