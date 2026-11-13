'use client';

import { Boxes, PackageCheck, UserCheck, UserMinus, Users } from 'lucide-react';

import { SampleBadge } from '@/components/SampleData';
import { ErrorState } from '@/components/states/ErrorState';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { summariseUsers } from '@/features/users/api';
import { useUsers } from '@/features/users/queries';
import { formatNumber } from '@/lib/format';

import { SAMPLE_USAGE_BY_LEVEL, USAGE_LEVELS } from './sampleData';
import { UsageCharts } from './UsageCharts';

export default function MohDashboardPage() {
  const users = useUsers();
  const summary = users.data ? summariseUsers(users.data) : null;

  return (
    <>
      {users.isError && !users.data ? (
        <div className="bg-card rounded-xl border">
          <ErrorState
            title="Could not load user figures"
            error={users.error}
            onRetry={() => void users.refetch()}
            isRetrying={users.isRefetching}
          />
        </div>
      ) : (
        <StatCardGrid>
          <StatCard
            label="Total users"
            value={formatNumber(summary?.total)}
            icon={Users}
            isLoading={users.isPending}
          />
          <StatCard
            label="Active users"
            value={formatNumber(summary?.active)}
            icon={UserCheck}
            isLoading={users.isPending}
          />
          <StatCard
            label="Inactive users"
            value={formatNumber(summary?.inactive)}
            icon={UserMinus}
            isLoading={users.isPending}
          />
        </StatCardGrid>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">Condom usage by level</h2>
          <SampleBadge />
        </div>
        <Tabs defaultValue="national">
          <TabsList>
            {USAGE_LEVELS.map((level) => (
              <TabsTrigger key={level} value={level}>
                {SAMPLE_USAGE_BY_LEVEL[level].label}
              </TabsTrigger>
            ))}
          </TabsList>
          {USAGE_LEVELS.map((level) => (
            <TabsContent key={level} value={level} className="mt-4">
              <StatCardGrid>
                <StatCard
                  label="Condoms at hand"
                  value={formatNumber(SAMPLE_USAGE_BY_LEVEL[level].atHand)}
                  icon={Boxes}
                  isSample
                />
                <StatCard
                  label="Condoms used"
                  value={formatNumber(SAMPLE_USAGE_BY_LEVEL[level].used)}
                  icon={PackageCheck}
                  isSample
                />
              </StatCardGrid>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <UsageCharts />
    </>
  );
}
