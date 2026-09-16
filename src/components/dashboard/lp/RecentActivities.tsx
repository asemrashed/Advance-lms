'use client';

import { LuClock as Clock, LuUserPlus as UserPlus, LuBookOpen as BookOpen, LuCheck as CheckCircle, LuTriangleAlert as AlertCircle, LuTrendingUp as TrendingUp } from 'react-icons/lu';;
import { TakaIcon } from '@/components/ui/TakaIcon';
import { useState, useEffect } from 'react';

interface RecentEnrollment {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  enrolledAt: string;
  status: string;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'completion' | 'payment' | 'exam' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
  amount?: number;
}

interface RecentActivitiesProps {
  recentEnrollments?: RecentEnrollment[];
  loading?: boolean;
}

const RecentActivities = ({ recentEnrollments = [], loading = false }: RecentActivitiesProps) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [filter, setFilter] = useState<'all' | 'enrollment' | 'completion' | 'payment' | 'exam'>('all');

  useEffect(() => {
    // Generate activities strictly from provided recentEnrollments (dynamic)
    const generatedActivities: RecentActivity[] = recentEnrollments.map((enrollment) => ({
      id: `enrollment-${enrollment.id}`,
      type: 'enrollment' as const,
      title: 'New Enrollment',
      description: `${enrollment.studentName} enrolled in ${enrollment.courseTitle}`,
      timestamp: enrollment.enrolledAt,
      status: 'success' as const,
      user: enrollment.studentName
    }));

    setActivities(
      [...generatedActivities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    );
  }, [recentEnrollments]);

  const getActivityIcon = (type: string, status: string) => {
    const iconClass = `w-4 h-4 ${
      status === 'success' ? 'text-green-500' :
      status === 'warning' ? 'text-yellow-500' :
      status === 'error' ? 'text-red-500' :
      'text-purple-500'
    }`;

    switch (type) {
      case 'enrollment':
        return <UserPlus className={iconClass} />;
      case 'completion':
        return <CheckCircle className={iconClass} />;
      case 'payment':
        return <TakaIcon className={iconClass} />;
      case 'exam':
        return <BookOpen className={iconClass} />;
      case 'system':
        return <AlertCircle className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-purple-50 border-purple-200 text-purple-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp?.trim()) return "N/A";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );
    if (Number.isNaN(diffInMinutes)) return "Invalid date";
    if (diffInMinutes < 0) return "Just now";
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.type === filter);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
          <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5" style={{ color: '#7B2CBF' }} />
          <h3 className="text-lg font-semibold text-gray-800">Recent Activities</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]"
          >
            <option value="all">All Activities</option>
            <option value="enrollment">Enrollments</option>
            <option value="completion">Completions</option>
            <option value="payment">Payments</option>
            <option value="exam">Exams</option>
          </select>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No recent activities</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.slice(0, 10).map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${getStatusColor(activity.status)}`}
            >
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type, activity.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold truncate">{activity.title}</h4>
                  <span className="text-xs opacity-75">{formatTimestamp(activity.timestamp)}</span>
                </div>
                <p className="text-sm opacity-90 mt-1">{activity.description}</p>
                {activity.user && (
                  <p className="text-xs opacity-75 mt-1">User: {activity.user}</p>
                )}
                {activity.amount && (
                  <p className="text-xs opacity-75 mt-1">Amount: ${activity.amount}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredActivities.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm font-medium transition-colors" style={{ color: '#7B2CBF' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}>
            View All Activities
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
