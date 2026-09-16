'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface TrendData {
  _id: string;
  count: number;
}

interface DashboardData {
  trends: {
    enrollments: TrendData[];
    completions: TrendData[];
    revenue?: Array<{ _id: string; total: number }>; // YYYY-MM, total amount
  };
  courseStats: Array<{
    id: string;
    title: string;
    enrollmentCount: number;
    completionRate: number;
  }>;
  paymentStats: {
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    successRate: number;
  };
}

interface AdvancedApexChartsProps {
  data?: DashboardData;
  loading?: boolean;
}

const AdvancedApexCharts = ({ data, loading = false }: AdvancedApexChartsProps) => {
  const [activeChart, setActiveChart] = useState<'enrollments' | 'completions' | 'courses' | 'payments' | 'revenue'>('enrollments');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatChartData = () => {
    const empty = {
      enrollmentData: [] as { x: string; y: number }[],
      completionData: [] as { x: string; y: number }[],
      courseData: [] as { x: string; y: number; z: number }[],
      paymentData: [] as { x: string; y: number; color: string }[],
      revenueData: [] as { x: string; y: number }[],
    };
    if (!data) return empty;

    const trends = data.trends || { enrollments: [], completions: [], revenue: [] };

    const safeWeekday = (id: string) => {
      const d = new Date(id);
      if (Number.isNaN(d.getTime())) return id || "N/A";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const enrollmentData = (trends.enrollments || []).map((item) => ({
      x: safeWeekday(item._id),
      y: item.count,
    }));

    const completionData = (trends.completions || []).map((item) => ({
      x: safeWeekday(item._id),
      y: item.count,
    }));

    const courseData = (data.courseStats || []).slice(0, 8).map((course) => ({
      x:
        course.title.length > 20
          ? course.title.substring(0, 20) + "..."
          : course.title,
      y: course.enrollmentCount,
      z: course.completionRate,
    }));

    const paymentData = data.paymentStats
      ? [
          { x: "Successful", y: data.paymentStats.successfulPayments, color: "#10b981" },
          { x: "Pending", y: data.paymentStats.pendingPayments, color: "#f59e0b" },
          { x: "Failed", y: data.paymentStats.failedPayments, color: "#ef4444" },
        ]
      : [];

    const revenueData = (trends.revenue || []).map((item) => {
      const parts = item._id.split("-");
      if (parts.length < 2) {
        return { x: item._id || "N/A", y: item.total };
      }
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      if (Number.isNaN(date.getTime())) {
        return { x: item._id, y: item.total };
      }
      return {
        x: date.toLocaleString("en-US", { month: "short" }),
        y: item.total,
      };
    });

    return {
      enrollmentData,
      completionData,
      courseData,
      paymentData,
      revenueData,
    };
  };

  const chartData = formatChartData();

  // Advanced chart configurations
  const enrollmentOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8,
        opacityTo: 0.2,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: '#3b82f6', opacity: 1 },
          { offset: 100, color: '#1d4ed8', opacity: 0.2 }
        ]
      }
    },
    colors: ['#3b82f6'],
    xaxis: {
      type: 'category',
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: function (val: number) {
          return val + ' enrollments'
        }
      }
    }
  };

  const completionOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8,
        opacityTo: 0.2,
        stops: [0, 100]
      }
    },
    colors: ['#10b981'],
    xaxis: {
      type: 'category',
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: function (val: number) {
          return val + ' completions'
        }
      }
    }
  };

  const courseOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#8b5cf6'],
    plotOptions: {
      bar: {
        borderRadius: 6,
        horizontal: true,
        dataLabels: {
          position: 'top'
        }
      }
    },
    xaxis: {
      type: 'numeric',
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: function (val: number, opts: any) {
          const completionRate = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].z;
          return val + ' enrollments (' + completionRate + '% completion)'
        }
      }
    }
  };

  const paymentOptions = {
    chart: {
      type: 'donut',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    labels: chartData.paymentData.map(item => item.x),
    dataLabels: {
      enabled: true,
      formatter: function (val: string, opts: any) {
        const label = opts.w.globals.labels[opts.seriesIndex];
        return label + ' (' + Math.round(Number(val)) + '%)'
      },
      style: {
        fontSize: '12px',
        fontWeight: 'bold'
      }
    },
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 500,
      labels: {
        colors: '#6b7280'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151'
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 700,
              color: '#111827',
              formatter: function (val: string) {
                return val
              }
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total Payments',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              formatter: function (w: any) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              }
            }
          }
        }
      }
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: function(val: number, opts: any) {
          const count = opts.w.config.series[opts.seriesIndex];
          const label = opts.w.globals.labels[opts.seriesIndex];
          return count + ' ' + label;
        }
      }
    }
  };

  const revenueOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 1000
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round'
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.8,
        opacityTo: 0.2,
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: '#f59e0b',
            opacity: 1
          },
          {
            offset: 100,
            color: '#d97706',
            opacity: 0.2
          }
        ]
      }
    },
    colors: ['#f59e0b'],
    xaxis: {
      type: 'category',
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280',
          fontSize: '12px',
          fontWeight: 500
        },
        formatter: function (val: number) {
          return '৳' + val.toLocaleString()
        }
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3
    },
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px'
      },
      y: {
        formatter: function (val: number) {
          return '৳' + val.toLocaleString()
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-300 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading charts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'enrollments', label: 'Enrollments', icon: '📈' },
          { key: 'completions', label: 'Completions', icon: '✅' },
          { key: 'courses', label: 'Top Courses', icon: '📚' },
          { key: 'payments', label: 'Payments', icon: '💳' },
          { key: 'revenue', label: 'Revenue', icon: '💰' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveChart(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeChart === key
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Dynamic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-6">
        {/* Enrollments Chart */}
        {activeChart === 'enrollments' && (
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Enrollment Trends (Last 7 Days)</h3>
            <Chart
              options={enrollmentOptions as any}
              series={[{ name: 'Enrollments', data: chartData.enrollmentData }]}
              type="area"
              height={350}
            />
          </div>
        )}

        {/* Completions Chart */}
        {activeChart === 'completions' && (
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Completion Trends (Last 7 Days)</h3>
            <Chart
              options={completionOptions as any}
              series={[{ name: 'Completions', data: chartData.completionData }]}
              type="area"
              height={350}
            />
          </div>
        )}

        {/* Top Courses Chart */}
        {activeChart === 'courses' && (
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Courses by Enrollment</h3>
            <Chart
              options={courseOptions as any}
              series={[{ name: 'Enrollments', data: chartData.courseData }]}
              type="bar"
              height={350}
            />
          </div>
        )}

        {/* Payment Status Chart */}
        {activeChart === 'payments' && (
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Status Distribution</h3>
            <Chart
              options={paymentOptions as any}
              series={chartData.paymentData.map(item => item.y)}
              type="donut"
              height={350}
            />
          </div>
        )}

        {/* Revenue Chart */}
        {activeChart === 'revenue' && (
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trends (6 Months)</h3>
            <Chart
              options={revenueOptions as any}
              series={[{ name: 'Revenue', data: chartData.revenueData }]}
              type="area"
              height={350}
            />
          </div>
        )}

        {/* Quick Stats removed per request */}
      </div>
    </div>
  );
};

export default AdvancedApexCharts;
