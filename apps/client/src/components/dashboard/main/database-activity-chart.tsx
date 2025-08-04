'use client';

import * as React from 'react';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface DatabaseActivityData {
  date: string;
  queries: number;
  connections: number;
  transactions: number;
}

interface DatabaseActivityChartProps {
  data: DatabaseActivityData[];
}

const chartConfig = {
  activity: {
    label: 'Database Activity',
  },
  queries: {
    label: 'SQL Queries',
    color: 'var(--chart-1)',
  },
  connections: {
    label: 'Active Connections',
    color: 'var(--chart-2)',
  },
  transactions: {
    label: 'Transactions',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig;

export function DatabaseActivityChart({ data }: DatabaseActivityChartProps) {
  const [activeMetric, setActiveMetric] = React.useState<keyof typeof chartConfig>('queries');

  const total = React.useMemo(
    () => ({
      queries: data.reduce((acc, curr) => acc + curr.queries, 0),
      connections: data.reduce((acc, curr) => acc + curr.connections, 0),
      transactions: data.reduce((acc, curr) => acc + curr.transactions, 0),
    }),
    [data]
  );

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Database Activity</CardTitle>
          <CardDescription>
            Database operations over the last 30 days
          </CardDescription>
        </div>
        <div className="flex">
          {['queries', 'connections', 'transactions'].map((key) => {
            const metric = key as keyof typeof chartConfig;
            return (
              <button
                key={metric}
                data-active={activeMetric === metric}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveMetric(metric)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[metric].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="activity"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                />
              }
            />
            <Line
              dataKey={activeMetric}
              type="monotone"
              stroke={`var(--color-${activeMetric})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 