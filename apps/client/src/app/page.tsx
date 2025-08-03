import { DatabaseActivityChart } from '@/components/dashboard/database-activity-chart';
import { SystemHealthCard } from '@/components/dashboard/system-health-card';
import { LogMonitorCard } from '@/components/dashboard/log-monitor-card';
import {
  mockDatabaseActivityData,
  mockSystemMetrics,
} from '@/lib/mock';

export default function Page() {
  return (
    <>
      {/* Top Row - 2 Cards */}
      <div className="grid grid-cols-2 gap-4 flex-shrink-0">
        <DatabaseActivityChart data={mockDatabaseActivityData} />
        <SystemHealthCard metrics={mockSystemMetrics} />
      </div>
      
      {/* Bottom Row - 1 Card */}
      <div className="flex-1 min-h-0">
        <LogMonitorCard />
      </div>
    </>
  );
}
