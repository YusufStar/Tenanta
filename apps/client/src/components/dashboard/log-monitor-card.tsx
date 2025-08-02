'use client';

import { Terminal, AlertCircle, CheckCircle, Info } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
}

interface LogMonitorCardProps {
  logs: LogEntry[];
}

export function LogMonitorCard({ logs }: LogMonitorCardProps) {
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

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4 text-green-400" />
          System Logs
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time system and application logs
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0">
        <div className="bg-black rounded-lg border border-gray-800 h-full min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-1 font-mono text-sm">
              {logs.map((log) => (
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
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
} 