import React from 'react';
import { Card } from '@/components/ui/card';
import { AreaChart, Stat } from '@/components/ui/charts';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/components/ui/core/styling';
import { DashboardQueryBoundary } from '@/components/shared/dashboard-query-boundary';
import { formatBytes, formatPercent } from '@/lib/format';
import { useBandwidth, type BandwidthWindow } from './queries';
import { SegmentedControl, displayUser } from './_components/shared';

/**
 * The widest window is the accounting period, so its label follows the period
 * mode rather than always claiming "30d".
 */
function windowOptions(
  monthly: boolean
): Array<{ value: BandwidthWindow; label: string }> {
  return [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: monthly ? 'This month' : '30d' },
  ];
}

function bucketLabel(ms: number, bucketMs: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  if (bucketMs < 86_400_000) {
    return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}h`;
  }
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

/** Usage against a cap, or a plain total when the cap is disabled. */
function UsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit <= 0) {
    return <span className="tabular-nums">{formatBytes(used)}</span>;
  }
  const ratio = Math.min(1, used / limit);
  const tone =
    ratio >= 1 ? 'bg-red-500' : ratio >= 0.85 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[--subtle]">
        <div
          className={cn('h-full', tone)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-[--muted]">
        {formatBytes(used)} / {formatBytes(limit)}
      </span>
    </div>
  );
}

/**
 * Bytes served through this instance. A direct debrid link the client fetches
 * itself never passes through here, so these are egress totals rather than the
 * user's total consumption.
 */
export function StreamsBandwidthPage() {
  const [window, setWindow] = React.useState<BandwidthWindow>('30d');
  const query = useBandwidth(window);
  const data = query.data;
  const monthly = data?.periodMode === 'monthly';
  const windows = windowOptions(monthly);

  const chartData = React.useMemo(
    () =>
      (data?.series ?? []).map((b) => ({
        t: bucketLabel(b.bucketMs, data?.bucketMs ?? 86_400_000),
        bytes: b.bytes,
      })),
    [data]
  );

  const periodLabel =
    monthly && data
      ? `since ${new Date(data.periodStart).toLocaleDateString()}`
      : 'rolling 30 days';

  // The widest window already is the accounting period, so a period tile only
  // adds anything while a narrower window is on screen.
  const showPeriodTile = (data?.globalLimit ?? 0) > 0 && window !== '30d';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[--muted]">
          Bytes served through AIOStreams. Unproxied links are not counted.
        </p>
        <SegmentedControl
          value={window}
          onChange={setWindow}
          options={windows}
        />
      </div>

      <DashboardQueryBoundary
        query={query}
        errorTitle="Failed to load bandwidth"
      >
        {(d) => (
          <>
            <div
              className={cn(
                'grid grid-cols-2 gap-3',
                showPeriodTile ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
              )}
            >
              <Stat label="Total" value={formatBytes(d.total)} />
              <Stat
                label="Usenet"
                value={formatBytes(d.byTransport.usenet ?? 0)}
                hint={
                  d.total > 0
                    ? formatPercent((d.byTransport.usenet ?? 0) / d.total)
                    : undefined
                }
              />
              <Stat
                label="Proxy"
                value={formatBytes(d.byTransport.proxy ?? 0)}
                hint={
                  d.total > 0
                    ? formatPercent((d.byTransport.proxy ?? 0) / d.total)
                    : undefined
                }
              />
              {showPeriodTile && (
                <Stat
                  label="This period"
                  value={formatBytes(d.periodTotal)}
                  hint={
                    d.globalLimit > 0
                      ? `of ${formatBytes(d.globalLimit)} · ${periodLabel}`
                      : periodLabel
                  }
                />
              )}
            </div>

            {d.globalLimit > 0 && (
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  Shared bandwidth pool
                </h3>
                <UsageBar used={d.periodTotal} limit={d.globalLimit} />
              </Card>
            )}

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Served over time</h3>
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-[--muted]">
                  Nothing served in this window.
                </p>
              ) : (
                <AreaChart
                  data={chartData}
                  xKey="t"
                  series={[
                    { key: 'bytes', label: 'Served', color: 'var(--brand)' },
                  ]}
                  height={240}
                  valueFormatter={(v) => formatBytes(Number(v))}
                  yTickFormatter={(v) => formatBytes(Number(v))}
                />
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <h3 className="p-4 pb-3 text-sm font-semibold">By user</h3>
              {d.byUser.length === 0 ? (
                <p className="p-8 pt-0 text-center text-sm text-[--muted]">
                  No usage recorded in this window.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[--subtle]/40 text-xs uppercase text-[--muted]">
                      <tr className="text-left">
                        <th className="p-3">User</th>
                        <th className="p-3">Usage this window</th>
                        <th className="p-3 text-right">Streams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.byUser.map((u) => (
                        <tr
                          key={u.username || '(unidentified)'}
                          className="border-t border-[--border]/50"
                        >
                          <td className="p-3 font-medium">
                            {displayUser(u.username)}
                          </td>
                          <td className="p-3">
                            <UsageBar used={u.bytes} limit={u.limit} />
                          </td>
                          <td className="p-3 text-right text-xs tabular-nums text-[--muted]">
                            {u.connectionLimit > 0 ? (
                              <Tooltip
                                trigger={<span>max {u.connectionLimit}</span>}
                              >
                                Concurrent stream limit
                              </Tooltip>
                            ) : (
                              'unlimited'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </DashboardQueryBoundary>
    </div>
  );
}
