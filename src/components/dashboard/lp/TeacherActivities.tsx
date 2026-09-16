'use client';

import { LuClock as Clock, LuBookOpen as BookOpen, LuUsers as Users, LuAward as Award, LuMessageSquare as MessageSquare, LuCalendar as Calendar, LuCheck as CheckCircle, LuTriangleAlert as AlertCircle } from 'react-icons/lu';;

interface Activity {
  type: 'course' | 'student' | 'assignment' | 'message' | 'rating' | 'schedule';
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'urgent';
}

interface TeacherActivitiesProps {
  activities: Activity[];
}

const TeacherActivities = ({ activities }: TeacherActivitiesProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course':
        return BookOpen;
      case 'student':
        return Users;
      case 'assignment':
        return Award;
      case 'message':
        return MessageSquare;
      case 'rating':
        return CheckCircle;
      case 'schedule':
        return Calendar;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: string, status?: string) => {
    if (status === 'urgent') return 'text-red-600 bg-red-100';
    if (status === 'pending') return 'text-yellow-600 bg-yellow-100';
    if (status === 'completed') return 'text-green-600 bg-green-100';
    
    switch (type) {
      case 'course':
        return 'text-purple-600 bg-purple-100';
      case 'student':
        return 'text-blue-600 bg-blue-100';
      case 'assignment':
        return 'text-green-600 bg-green-100';
      case 'message':
        return 'text-pink-600 bg-pink-100';
      case 'rating':
        return 'text-orange-600 bg-orange-100';
      case 'schedule':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp?.trim()) return "N/A";
    const activityTime = new Date(timestamp);
    if (Number.isNaN(activityTime.getTime())) return "Invalid date";
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - activityTime.getTime()) / (1000 * 60),
    );
    if (Number.isNaN(diffInMinutes)) return "Invalid date";
    if (diffInMinutes < 0) return "Just now";
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    }
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
          const colorClass = getActivityColor(activity.type, activity.status);
          
          return (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">{activity.title}</p>
                <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
              </div>
              <div className="flex-shrink-0">
                {activity.status === 'urgent' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                ) : activity.status === 'pending' ? (
                  <Clock className="w-4 h-4 text-yellow-500" />
                ) : (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TeacherActivities;
