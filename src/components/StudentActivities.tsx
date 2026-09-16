'use client';

import { LuClock as Clock, LuBookOpen as BookOpen, LuCheck as CheckCircle, LuTrendingUp as TrendingUp, LuCalendar as Calendar, LuAward as Award } from 'react-icons/lu';;

interface Activity {
  type: 'enrollment' | 'completion' | 'progress';
  course: string;
  timestamp: string;
  description: string;
}

interface StudentActivitiesProps {
  activities: Activity[];
}

const StudentActivities = ({ activities }: StudentActivitiesProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return BookOpen;
      case 'completion':
        return CheckCircle;
      case 'progress':
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'text-blue-600 bg-blue-100';
      case 'completion':
        return 'text-green-600 bg-green-100';
      case 'progress':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      ) : (
        activities.map((activity, index) => {
          const IconComponent = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);
          
          return (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default StudentActivities;
