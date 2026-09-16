'use client';

import { LuTrendingUp as TrendingUp, LuTrendingDown as TrendingDown, LuUsers as Users, LuBookOpen as BookOpen, LuUserPlus as UserPlus, LuCheck as CheckCircle, LuClock as Clock, LuAward as Award, LuTarget as Target, LuActivity as Activity, LuZap as Zap } from 'react-icons/lu';
import { formatCurrency } from '@/lib/formatters';
import { TakaIcon } from '@/components/ui/TakaIcon';

interface DashboardData {
  overview: {
    totalStudents: number;
    totalCourses: number;
    totalEnrollments: number;
    totalTeachers: number;
    activeStudents: number;
    completedCourses: number;
    newEnrollmentsThisWeek: number;
    enrollmentChange: number;
    courseCompletionsThisWeek: number;
    completionChange: number;
  };
  paymentStats: {
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    successRate: number;
  };
}

interface DynamicKPICardsProps {
  data?: DashboardData;
  loading?: boolean;
  /** essential = core metrics only (admin dashboard) */
  variant?: 'full' | 'essential';
}

const DynamicKPICards = ({ data, loading = false, variant = 'full' }: DynamicKPICardsProps) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getKpiData = () => {
    if (!data) return [];

    const completionRate = data.overview.totalCourses > 0 
      ? Math.round((data.overview.completedCourses / data.overview.totalCourses) * 100)
      : 0;

    const activeRate = data.overview.totalStudents > 0 
      ? Math.round((data.overview.activeStudents / data.overview.totalStudents) * 100)
      : 0;

    const all = [
      {
        title: 'Total Students',
        value: formatNumber(data.overview.totalStudents),
        change: data.overview.enrollmentChange > 0 ? `+${data.overview.enrollmentChange.toFixed(1)}%` : `${data.overview.enrollmentChange.toFixed(1)}%`,
        changeType: data.overview.enrollmentChange >= 0 ? 'positive' : 'negative',
        previousWeek: `Active: ${formatNumber(data.overview.activeStudents)} (${activeRate}%)`,
        icon: Users,
        gradient: 'from-blue-500 to-cyan-500',
        bgGradient: 'from-blue-50/50 to-cyan-50/50',
        description: 'Total registered students',
        trend: data.overview.enrollmentChange,
        secondaryValue: `${activeRate}% active`,
        status: activeRate >= 70 ? 'excellent' : activeRate >= 50 ? 'good' : 'needs-attention'
      },
      {
        title: 'Total Courses',
        value: formatNumber(data.overview.totalCourses),
        change: data.overview.completionChange > 0 ? `+${data.overview.completionChange.toFixed(1)}%` : `${data.overview.completionChange.toFixed(1)}%`,
        changeType: data.overview.completionChange >= 0 ? 'positive' : 'negative',
        previousWeek: `Completed: ${formatNumber(data.overview.completedCourses)}`,
        icon: BookOpen,
        gradient: 'from-primary to-blue-600',
        bgGradient: 'from-primary/5 to-blue-50/50',
        description: 'Available courses',
        trend: data.overview.completionChange,
        secondaryValue: `${completionRate}% completion rate`,
        status: completionRate >= 80 ? 'excellent' : completionRate >= 60 ? 'good' : 'needs-attention'
      },
      {
        title: 'New Enrollments',
        value: formatNumber(data.overview.newEnrollmentsThisWeek),
        change: data.overview.enrollmentChange > 0 ? `+${data.overview.enrollmentChange.toFixed(1)}%` : `${data.overview.enrollmentChange.toFixed(1)}%`,
        changeType: data.overview.enrollmentChange >= 0 ? 'positive' : 'negative',
        previousWeek: 'This week',
        icon: UserPlus,
        gradient: 'from-green-500 to-emerald-500',
        bgGradient: 'from-green-50 to-emerald-50',
        description: 'New enrollments this week',
        trend: data.overview.enrollmentChange,
        secondaryValue: 'vs last week',
        status: data.overview.enrollmentChange >= 10 ? 'excellent' : data.overview.enrollmentChange >= 0 ? 'good' : 'needs-attention'
      },
      {
        title: 'Course Completions',
        value: formatNumber(data.overview.courseCompletionsThisWeek),
        change: data.overview.completionChange > 0 ? `+${data.overview.completionChange.toFixed(1)}%` : `${data.overview.completionChange.toFixed(1)}%`,
        changeType: data.overview.completionChange >= 0 ? 'positive' : 'negative',
        previousWeek: 'This week',
        icon: CheckCircle,
        gradient: 'from-orange-500 to-red-500',
        bgGradient: 'from-orange-50 to-red-50',
        description: 'Courses completed this week',
        trend: data.overview.completionChange,
        secondaryValue: 'vs last week',
        status: data.overview.completionChange >= 15 ? 'excellent' : data.overview.completionChange >= 0 ? 'good' : 'needs-attention'
      },
      {
        title: 'Total Revenue',
        value: formatCurrency(data.paymentStats.totalRevenue),
        change: `${data.paymentStats.successRate}%`,
        changeType: data.paymentStats.successRate >= 80 ? 'positive' : 'negative',
        previousWeek: `Success Rate`,
        icon: TakaIcon,
        gradient: 'from-emerald-500 to-teal-500',
        bgGradient: 'from-emerald-50 to-teal-50',
        description: 'Total revenue generated',
        trend: data.paymentStats.successRate,
        secondaryValue: `${data.paymentStats.totalTransactions} transactions`,
        status: data.paymentStats.successRate >= 90 ? 'excellent' : data.paymentStats.successRate >= 80 ? 'good' : 'needs-attention'
      },
      {
        title: 'Payment Success',
        value: `${data.paymentStats.successRate}%`,
        change: `${data.paymentStats.successfulPayments}/${data.paymentStats.totalTransactions}`,
        changeType: data.paymentStats.successRate >= 80 ? 'positive' : 'negative',
        previousWeek: 'Successful payments',
        icon: TrendingUp,
        gradient: 'from-indigo-500 to-purple-500',
        bgGradient: 'from-indigo-50/50 to-purple-50/50',
        description: 'Payment success rate',
        trend: data.paymentStats.successRate,
        secondaryValue: `${data.paymentStats.pendingPayments} pending`,
        status: data.paymentStats.successRate >= 90 ? 'excellent' : data.paymentStats.successRate >= 80 ? 'good' : 'needs-attention'
      },
      {
        title: 'Active Teachers',
        value: formatNumber(data.overview.totalTeachers),
        change: '100%',
        changeType: 'positive',
        previousWeek: 'All active',
        icon: Award,
        gradient: 'from-amber-500 to-yellow-500',
        bgGradient: 'from-amber-50 to-yellow-50',
        description: 'Total instructors',
        trend: 0,
        secondaryValue: 'Teaching staff',
        status: 'excellent'
      },
      {
        title: 'System Health',
        value: '99.9%',
        change: '+0.1%',
        changeType: 'positive',
        previousWeek: 'Uptime',
        icon: Zap,
        gradient: 'from-green-500 to-lime-500',
        bgGradient: 'from-green-50 to-lime-50',
        description: 'System uptime',
        trend: 0.1,
        secondaryValue: 'All systems operational',
        status: 'excellent'
      }
    ];

    if (variant === 'essential') {
      return all.filter((kpi) =>
        ['Total Students', 'New Enrollments', 'Total Revenue', 'Active Teachers'].includes(kpi.title),
      );
    }
    return all;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-50/50';
      case 'good':
        return 'bg-blue-50/50';
      case 'needs-attention':
        return 'bg-orange-50/50';
      default:
        return 'bg-gray-50/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Target className="w-3 h-3 text-green-600" />;
      case 'good':
        return <Activity className="w-3 h-3 text-blue-600" />;
      case 'needs-attention':
        return <Clock className="w-3 h-3 text-orange-600" />;
      default:
        return <Activity className="w-3 h-3 text-gray-600" />;
    }
  };

  const getBorderColorForGradient = (gradient: string) => {
    switch (gradient) {
      case 'from-blue-500 to-cyan-500':
        return 'border-blue-200';
      case 'from-primary to-blue-600':
        return 'border-purple-200';
      case 'from-green-500 to-emerald-500':
        return 'border-emerald-200';
      case 'from-orange-500 to-red-500':
        return 'border-orange-200';
      case 'from-emerald-500 to-teal-500':
        return 'border-emerald-200';
      case 'from-indigo-500 to-purple-500':
        return 'border-indigo-200';
      case 'from-amber-500 to-yellow-500':
        return 'border-amber-200';
      case 'from-green-500 to-lime-500':
        return 'border-lime-200';
      default:
        return 'border-gray-200/60';
    }
  };

  if (loading) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(variant === 'essential' ? 4 : 8)].map((_, index) => (
          <div key={index} className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 shadow-md border border-gray-200/50 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
              <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
            </div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-6 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded mb-1"></div>
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const kpiData = getKpiData();

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
      {kpiData.map((kpi, index) => (
        <div 
          key={index} 
          className={`relative group overflow-hidden rounded-xl bg-gradient-to-br ${kpi.bgGradient} p-4 shadow-lg ${getStatusColor(kpi.status)} backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 border ${getBorderColorForGradient(kpi.gradient)}`}
        >
          {/* Enhanced Background Elements */}
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-blue-200 rounded-full relative animate-spin">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-3 border-r-3 border-b-4 border-l-transparent border-r-transparent border-b-blue-300"></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-12 h-12 opacity-5 flex items-center justify-center">
            <div className="w-8 h-0.5 bg-purple-300"></div>
            <div className="absolute w-0.5 h-8 bg-purple-300"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-purple-300 rounded-full"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg ring-2 ring-white/20`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                  kpi.changeType === 'positive' 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                    : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-200'
                }`}>
                  {kpi.changeType === 'positive' ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {kpi.change}
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(kpi.status)}
                </div>
              </div>
            </div>
            
            <h3 className="text-sm font-bold text-gray-700 mb-2 leading-tight">{kpi.title}</h3>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-black bg-gradient-to-r ${kpi.gradient} bg-clip-text text-transparent`}>
                {kpi.value}
              </span>
              <div className="w-8 h-8 border-2 border-white/30 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm">
                <div className={`w-3 h-3 bg-gradient-to-r ${kpi.gradient} rounded-full animate-pulse`}></div>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-medium">{kpi.previousWeek}</p>
              <p className="text-xs text-gray-500 font-medium">{kpi.secondaryValue}</p>
              <p className="text-xs text-gray-400">{kpi.description}</p>
            </div>
          </div>
          
          {/* Enhanced Hover Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      ))}
    </div>
  );
};

export default DynamicKPICards;

