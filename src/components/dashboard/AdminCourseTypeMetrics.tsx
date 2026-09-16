'use client';

import {
  LuVideo as Video,
  LuLayers as Layers,
  LuUsers as Users,
  LuGraduationCap as GraduationCap,
  LuBookOpen as BookOpen,
  LuTrendingUp as TrendingUp,
} from 'react-icons/lu';
import { TakaIcon } from '@/components/ui/TakaIcon';
import { formatBdt } from '@/lib/currency';
import type { IconType } from 'react-icons';

export type CourseTypeMetricBlock = {
  totalCourses: number;
  totalBatches: number;
  totalStudents: number;
  totalInstructors: number;
  totalRevenue: number;
};

type AdminCourseTypeMetricsProps = {
  live: CourseTypeMetricBlock;
  recorded: CourseTypeMetricBlock;
  loading?: boolean;
};

type MetricTone =
  | 'blue'
  | 'indigo'
  | 'green'
  | 'orange'
  | 'teal'
  | 'purple'
  | 'amber'
  | 'lime';

type MetricDef = {
  key: keyof CourseTypeMetricBlock;
  label: string;
  icon: IconType;
  tone: MetricTone;
  format?: 'currency';
};

const TONE_STYLES: Record<
  MetricTone,
  { card: string; icon: string; value: string; border: string }
> = {
  blue: {
    card: 'bg-gradient-to-br from-blue-50/50 to-cyan-50/50',
    icon: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    value: 'bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent',
    border: 'border-blue-200',
  },
  indigo: {
    card: 'bg-gradient-to-br from-primary/5 to-blue-50/50',
    icon: 'bg-gradient-to-br from-primary to-blue-600',
    value: 'bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent',
    border: 'border-purple-200',
  },
  green: {
    card: 'bg-gradient-to-br from-green-50 to-emerald-50',
    icon: 'bg-gradient-to-br from-green-500 to-emerald-500',
    value: 'bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent',
    border: 'border-emerald-200',
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-50 to-red-50',
    icon: 'bg-gradient-to-br from-orange-500 to-red-500',
    value: 'bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent',
    border: 'border-orange-200',
  },
  teal: {
    card: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    icon: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    value: 'bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent',
    border: 'border-emerald-200',
  },
  purple: {
    card: 'bg-gradient-to-br from-indigo-50/50 to-purple-50/50',
    icon: 'bg-gradient-to-br from-indigo-500 to-purple-500',
    value: 'bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent',
    border: 'border-indigo-200',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    icon: 'bg-gradient-to-br from-amber-500 to-yellow-500',
    value: 'bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent',
    border: 'border-amber-200',
  },
  lime: {
    card: 'bg-gradient-to-br from-green-50 to-lime-50',
    icon: 'bg-gradient-to-br from-green-500 to-lime-500',
    value: 'bg-gradient-to-r from-green-500 to-lime-500 bg-clip-text text-transparent',
    border: 'border-lime-200',
  },
};

const LIVE_METRICS: MetricDef[] = [
  { key: 'totalCourses', label: 'Live Courses', icon: Video, tone: 'blue' },
  { key: 'totalBatches', label: 'Batches', icon: Layers, tone: 'indigo' },
  { key: 'totalStudents', label: 'Students', icon: Users, tone: 'green' },
  { key: 'totalInstructors', label: 'Instructors', icon: GraduationCap, tone: 'orange' },
  {
    key: 'totalRevenue',
    label: 'Revenue',
    icon: TakaIcon as IconType,
    tone: 'teal',
    format: 'currency',
  },
];

const RECORDED_METRICS: MetricDef[] = [
  { key: 'totalCourses', label: 'Recorded Courses', icon: BookOpen, tone: 'purple' },
  { key: 'totalStudents', label: 'Students', icon: Users, tone: 'amber' },
  { key: 'totalInstructors', label: 'Instructors', icon: GraduationCap, tone: 'lime' },
  {
    key: 'totalRevenue',
    label: 'Revenue',
    icon: TrendingUp,
    tone: 'teal',
    format: 'currency',
  },
];

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  icon: IconType;
  tone: MetricTone;
  loading?: boolean;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-3.5 shadow-sm ${styles.card} ${styles.border}`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-md ring-2 ring-white/20 ${styles.icon}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/30 bg-white/20">
          <div className={`h-2.5 w-2.5 rounded-full ${styles.icon}`} />
        </div>
      </div>
      <p className="mb-1 text-sm font-bold leading-tight text-gray-700">{label}</p>
      {loading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-white/70" />
      ) : (
        <p className={`text-xl font-black tabular-nums ${styles.value}`}>{value}</p>
      )}
    </div>
  );
}

function MetricRow({
  title,
  metrics,
  data,
  loading,
}: {
  title: string;
  metrics: MetricDef[];
  data: CourseTypeMetricBlock;
  loading?: boolean;
}) {
  const cols =
    metrics.length >= 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className={`grid gap-3 ${cols}`}>
        {metrics.map((m) => {
          const raw = data[m.key];
          const value =
            m.format === 'currency' ? formatBdt(raw) : raw.toLocaleString();
          return (
            <MetricCard
              key={`${title}-${m.key}`}
              label={m.label}
              value={value}
              icon={m.icon}
              tone={m.tone}
              loading={loading}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AdminCourseTypeMetrics({
  live,
  recorded,
  loading = false,
}: AdminCourseTypeMetricsProps) {
  return (
    <div className="space-y-5">
      <MetricRow title="Live" metrics={LIVE_METRICS} data={live} loading={loading} />
      <MetricRow
        title="Recorded"
        metrics={RECORDED_METRICS}
        data={recorded}
        loading={loading}
      />
    </div>
  );
}
