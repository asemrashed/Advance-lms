'use client';

import dynamic from 'next/dynamic';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

// Dynamically import ApexCharts to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StudentProgressChartProps {
  enrollments: Array<{
    course: {
      title: string;
    };
    progress: number;
    enrolledAt: string;
  }>;
}

const StudentProgressChart = ({ enrollments }: StudentProgressChartProps) => {
  const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];

  // Prepare data for charts (null-safe)
  const progressData = safeEnrollments.map((enrollment, idx) => {
    const anyEnroll: any = enrollment as any;
    const rawTitle = anyEnroll?.course?.title || anyEnroll?.courseInfo?.title || '';
    const fallbackTitle = rawTitle && rawTitle.trim().length > 0 ? rawTitle : `Course ${idx + 1}`;
    const shortName = fallbackTitle.length > 22 ? fallbackTitle.substring(0, 22) + '…' : fallbackTitle;
    return {
      name: shortName,
      progress: typeof enrollment?.progress === 'number' ? enrollment.progress : 0,
      fullName: fallbackTitle
    };
  });

  // ApexCharts config for Course Progress Overview
  const progressCategories = progressData.map(d => d.fullName);
  const progressSeries = [{ name: 'Progress', data: progressData.map(d => Math.max(0, Math.min(100, d.progress))) }];
  const progressOptions: any = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 700 }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '45%',
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: { colors: ['#111827'], fontSize: '12px' }
    },
    xaxis: {
      categories: progressCategories,
      labels: {
        rotate: -35,
        trim: true,
        formatter: (val: string) => (val && val.length > 18 ? val.substring(0, 18) + '…' : val),
        style: { colors: '#6B7280', fontSize: '12px' }
      }
    },
    yaxis: {
      max: 100,
      labels: { formatter: (val: number) => `${val}%`, style: { colors: '#6B7280', fontSize: '12px' } }
    },
    grid: { borderColor: '#e5e7eb', strokeDashArray: 3 },
    colors: ['#3b82f6'],
    tooltip: { theme: 'light' }
  };

  const pieData = [
    { name: 'Completed', value: safeEnrollments.filter(e => (e?.progress ?? 0) === 100).length, color: '#10B981' },
    { name: 'In Progress', value: safeEnrollments.filter(e => (e?.progress ?? 0) > 0 && (e?.progress ?? 0) < 100).length, color: '#3B82F6' },
    { name: 'Not Started', value: safeEnrollments.filter(e => (e?.progress ?? 0) === 0).length, color: '#6B7280' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{payload[0].payload.fullName}</p>
          <p className="text-sm text-blue-600">
            Progress: <span className="font-bold">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar Chart - ApexCharts */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Progress Overview</h3>
        <ApexChart options={progressOptions} series={progressSeries} type="bar" height={300} />
      </div>

      {/* Progress Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [`${value} courses`, 'Count']}
                labelStyle={{ color: '#374151' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-gray-700">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Goals */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Goals</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Complete 5 courses</span>
                <span className="font-medium text-gray-900">
                  {safeEnrollments.filter(e => (e?.progress ?? 0) === 100).length}/5
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((safeEnrollments.filter(e => (e?.progress ?? 0) === 100).length / 5) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Study 20 hours</span>
                <span className="font-medium text-gray-900">
                  {Math.floor(safeEnrollments.reduce((sum, e) => sum + ((e?.progress ?? 0) * 0.1), 0))}h
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((safeEnrollments.reduce((sum, e) => sum + ((e?.progress ?? 0) * 0.1), 0) / 20) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Maintain 80% average</span>
                <span className="font-medium text-gray-900">
                  {Math.round(safeEnrollments.reduce((sum, e) => sum + (e?.progress ?? 0), 0) / Math.max(safeEnrollments.length, 1))}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((safeEnrollments.reduce((sum, e) => sum + (e?.progress ?? 0), 0) / Math.max(safeEnrollments.length, 1)) / 80 * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressChart;
