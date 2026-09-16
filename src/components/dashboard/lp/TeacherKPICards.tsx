'use client';

import { LuTrendingUp as TrendingUp, LuTrendingDown as TrendingDown, LuBookOpen as BookOpen, LuUsers as Users, LuAward as Award, LuClock as Clock, LuStar as Star, LuMessageSquare as MessageSquare } from 'react-icons/lu';;

interface TeacherKPICardsProps {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  averageRating: number;
  totalHours: number;
  unreadMessages: number;
}

const TeacherKPICards = ({ 
  totalCourses, 
  totalStudents, 
  totalAssignments, 
  averageRating, 
  totalHours,
  unreadMessages 
}: TeacherKPICardsProps) => {
  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const kpiData = [
    {
      title: 'Total Courses',
      value: totalCourses.toString(),
      change: '+2',
      changeType: 'positive' as const,
      previousWeek: 'This month',
      icon: BookOpen,
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50'
    },
    {
      title: 'Total Students',
      value: totalStudents.toString(),
      change: '+15',
      changeType: 'positive' as const,
      previousWeek: 'Active learners',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50'
    },
    {
      title: 'Assignments',
      value: totalAssignments.toString(),
      change: '+5',
      changeType: 'positive' as const,
      previousWeek: 'This week',
      icon: Award,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50'
    },
    {
      title: 'Average Rating',
      value: averageRating.toFixed(1),
      change: '+0.2',
      changeType: 'positive' as const,
      previousWeek: 'Student feedback',
      icon: Star,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50'
    },
    {
      title: 'Teaching Hours',
      value: formatHours(totalHours),
      change: '+3h',
      changeType: 'positive' as const,
      previousWeek: 'This week',
      icon: Clock,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50'
    },
    {
      title: 'Unread Messages',
      value: unreadMessages.toString(),
      change: unreadMessages > 0 ? '+3' : '0',
      changeType: unreadMessages > 0 ? 'positive' as const : 'neutral' as const,
      previousWeek: 'Student inquiries',
      icon: MessageSquare,
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-50 to-rose-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4">
      {kpiData.map((kpi, index) => (
        <div key={index} className={`relative group overflow-hidden rounded-xl bg-gradient-to-br ${kpi.bgGradient} p-4 shadow-md border border-gray-200/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.01]`}>
          {/* Educational Geometric Background Elements */}
          <div className="absolute top-0 right-0 w-12 h-12 opacity-10 flex items-center justify-center">
            <div className="w-8 h-8 border border-purple-200 rounded-full relative">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-2 border-r-2 border-b-3 border-l-transparent border-r-transparent border-b-purple-300"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-2 border-r-2 border-t-3 border-l-transparent border-r-transparent border-t-purple-300 rotate-180"></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-10 h-10 opacity-5 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-indigo-300"></div>
            <div className="absolute w-0.5 h-6 bg-indigo-300"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.gradient} shadow-md`}>
                <kpi.icon className="w-4 h-4 text-white" />
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                kpi.changeType === 'positive' 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                  : kpi.changeType === 'neutral'
                  ? 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200'
                  : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border border-red-200'
              }`}>
                {kpi.changeType === 'positive' ? (
                  <TrendingUp size={12} />
                ) : kpi.changeType === 'neutral' ? (
                  <TrendingDown size={12} />
                ) : null}
                {kpi.change}
              </div>
            </div>
            
            <h3 className="text-xs font-semibold text-gray-600 mb-2 leading-tight">{kpi.title}</h3>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold bg-gradient-to-r ${kpi.gradient} bg-clip-text text-transparent`}>
                {kpi.value}
              </span>
              <div className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center">
                <div className={`w-2 h-2 bg-gradient-to-r ${kpi.gradient} rounded-full animate-pulse`}></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium">{kpi.previousWeek}</p>
          </div>
          
          {/* Hover Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 -translate-x-full group-hover:translate-x-full"></div>
        </div>
      ))}
    </div>
  );
};

export default TeacherKPICards;
