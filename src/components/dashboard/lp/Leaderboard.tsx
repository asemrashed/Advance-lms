'use client';

import { LuTrophy as Trophy, LuMedal as Medal, LuAward as Award, LuStar as Star, LuClock as Clock, LuBookOpen as BookOpen, LuTrendingUp as TrendingUp } from 'react-icons/lu';;
import { useState } from 'react';

interface LeaderboardEntry {
  _id: string;
  name: string;
  email: string;
  completedCourses: number;
  averageProgress: number;
  totalTimeSpent: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
  loading?: boolean;
}

const Leaderboard = ({ data, loading = false }: LeaderboardProps) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  const formatTimeSpent = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500 bg-gray-100 rounded-full">
          {index + 1}
        </span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 1:
        return 'from-gray-50 to-gray-100 border-gray-200';
      case 2:
        return 'from-amber-50 to-amber-100 border-amber-200';
      default:
        return 'from-purple-50/50 to-pink-50/50 border-purple-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Top Performers</h3>
          <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-16"></div>
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
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-800">Top Performers</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as 'all' | 'week' | 'month')}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No performance data available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 10).map((student, index) => (
            <div
              key={student._id}
              className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getRankColor(index)}`}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(index)}
              </div>

              {/* Student LuInfo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {student.name || 'Unknown Student'}
                  </h4>
                  {index < 3 && (
                    <Star className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {student.email}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <BookOpen className="w-3 h-3" />
                    <span className="font-medium">{student.completedCourses}</span>
                  </div>
                  <p className="text-xs text-gray-500">Courses</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium">{student.averageProgress}%</span>
                  </div>
                  <p className="text-xs text-gray-500">Avg Progress</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">{formatTimeSpent(student.totalTimeSpent)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Study Time</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-sm font-medium transition-colors" style={{ color: '#7B2CBF' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}>
            View All {data.length} Students
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
