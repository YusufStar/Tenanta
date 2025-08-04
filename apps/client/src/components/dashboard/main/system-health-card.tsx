'use client';

import { Cpu, MemoryStick, HardDrive, Database, Network, Server, Activity, Zap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  iconName: 'Cpu' | 'MemoryStick' | 'HardDrive' | 'Database' | 'Network' | 'Server' | 'Activity' | 'Zap';
  color: string;
  status: 'healthy' | 'warning' | 'critical';
  description?: string;
}

interface SystemHealthCardProps {
  metrics: SystemMetric[];
}

export function SystemHealthCard({ metrics }: SystemHealthCardProps) {
  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-600/75';
      case 'warning':
        return 'text-amber-600/75';
      case 'critical':
        return 'text-red-600/75';
      default:
        return 'text-gray-600/75';
    }
  };

  const getProgressColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500/75';
      case 'warning':
        return 'bg-amber-500/75';
      case 'critical':
        return 'bg-red-500/75';
      default:
        return 'bg-gray-500/75';
    }
  };

  const getIconComponent = (iconName: SystemMetric['iconName']) => {
    switch (iconName) {
      case 'Cpu':
        return Cpu;
      case 'MemoryStick':
        return MemoryStick;
      case 'HardDrive':
        return HardDrive;
      case 'Database':
        return Database;
      case 'Network':
        return Network;
      case 'Server':
        return Server;
      case 'Activity':
        return Activity;
      case 'Zap':
        return Zap;
      default:
        return Cpu;
    }
  };

  const getUsagePercentage = (value: number, max: number) => {
    return Math.round((value / max) * 100);
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage < 60) return 'healthy';
    if (percentage < 85) return 'warning';
    return 'critical';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-emerald-600/75" />
          System Health
        </CardTitle>
        <CardDescription className="text-xs">
          Real-time system metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const IconComponent = getIconComponent(metric.iconName);
            const percentage = getUsagePercentage(metric.value, metric.max);
            const status = getUsageStatus(percentage);
            
            return (
              <div key={metric.name} className="space-y-2 p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`h-3 w-3 ${getStatusColor(status)}`} />
                    <span className="text-xs font-medium">{metric.name}</span>
                  </div>
                  <span className="text-xs font-semibold">
                    {metric.value.toLocaleString()}{metric.unit}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0{metric.unit}</span>
                    <span className={`font-medium ${getStatusColor(status)}`}>
                      {percentage}%
                    </span>
                    <span>{metric.max.toLocaleString()}{metric.unit}</span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className="h-1.5 bg-muted/50"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-1.5 rounded-full transition-all duration-300 ${getProgressColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-muted/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/75"></div>
              <span className="font-medium text-emerald-600/75">Healthy</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 