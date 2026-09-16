'use client';

import { LuLayoutDashboard, LuBookOpen as BookOpen, LuCalendar as Calendar, LuBell, LuAward as Award, LuBookmark, LuClipboardList, LuUserCheck as UserCheck, LuTrendingUp as TrendingUp, LuCircle as HelpCircle, LuSettings as Settings, LuLogOut, LuPlay as PlayCircle, LuFileText as LuFileText, LuTarget as Target, LuChartBar, LuUsers as Users, LuStar as Star, LuGraduationCap as GraduationCap, LuClock as Clock, LuCheck as CheckCircle2, LuTimer as Timer, LuMegaphone, LuGlobe as Globe } from 'react-icons/lu';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/authSlice';
import { useEffect, useMemo, useState } from 'react';
import { useRecordedCoursesEnabled } from '@/hooks/useRecordedCoursesEnabled';
import { RECORDED_COURSES_CATALOG_HREF } from '@/lib/studentPortalSettings';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { DashboardSidebarBrand } from '@/components/dashboard/DashboardSidebarBrand';

const StudentSidebar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { recordedCoursesEnabled } = useRecordedCoursesEnabled();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  // State for dynamic badges
  const [examBadges, setExamBadges] = useState({
    availableExams: 0,
    inProgressExams: 0,
    pendingResults: 0
  });

  useEffect(() => {
    // Shared sidebar avoids direct business fetches in Phase 14B.
    // Badge hydration will move through dedicated Redux domain flows.
    setExamBadges({
      availableExams: 0,
      inProgressExams: 0,
      pendingResults: 0,
    });
  }, [user]);

  const menuItems = useMemo(() => {
    const learningItems = [
      { 
        icon: BookOpen, 
        label: 'Courses', 
        href: '/student/courses',
        description: 'Recorded & live programs',
        badge: null
      },
      ...(recordedCoursesEnabled
        ? [
            {
              icon: Globe,
              label: 'Browse Courses',
              href: RECORDED_COURSES_CATALOG_HREF,
              description: 'Filter by subject & instructor',
              badge: null,
            },
          ]
        : []),
      { 
        icon: GraduationCap, 
        label: 'Exams', 
        href: '/student/exams',
        description: 'Take exams & assessments',
        badge: examBadges.inProgressExams > 0 ? examBadges.inProgressExams.toString() : null
      },
      { 
        icon: LuFileText, 
        label: 'Assignments', 
        href: '/student/assignments',
        description: 'Tasks & projects',
        badge: '2'
      },
      {
        icon: LuMegaphone,
        label: 'Notice Board',
        href: '/student/notice-board',
        description: 'Classes, schedule & notices',
        badge: null,
      },
      { 
        icon: LuBookmark, 
        label: 'Past Papers', 
        href: '/student/past-papers',
        description: 'Question papers',
        badge: null
      },
      { 
        icon: Star, 
        label: 'Reviews', 
        href: '/student/reviews',
        description: 'Course reviews & feedback',
        badge: null
      }
    ];

    return [
    {
      category: 'Main',
      items: [
        { 
          icon: LuLayoutDashboard, 
          label: 'Dashboard', 
          href: '/student/dashboard',
          description: 'Overview & progress',
          badge: null
        }
      ]
    },
    {
      category: 'Learning',
      items: learningItems,
    },
    {
      category: 'Performance',
      items: [
        { 
          icon: LuChartBar, 
          label: 'Progress', 
          href: '/student/progress',
          description: 'Learning analytics',
          badge: null
        },
        { 
          icon: Clock, 
          label: 'Exam History', 
          href: '/student/exam-history',
          description: 'Past exam results',
          badge: examBadges.pendingResults > 0 ? examBadges.pendingResults.toString() : null
        }
      ]
    },
    {
      category: 'Account',
      items: [
        { 
          icon: Users, 
          label: 'Profile', 
          href: '/student/profile',
          description: 'Personal information',
          badge: null
        },
        { 
          icon: Settings, 
          label: 'Settings', 
          href: '/student/settings',
          description: 'Account settings',
          badge: null
        }
      ]
    }
  ];
  }, [examBadges, recordedCoursesEnabled]);

  // Function to check if a menu item is active
  const isActive = (href: string) => {
    if (href === '/student/dashboard') {
      return pathname === '/student/dashboard';
    }
    if (href === '/student/settings') {
      return pathname === '/student/settings';
    }
    if (href === '/student/exams') {
      return pathname.startsWith('/student/exams');
    }
    if (href === '/student/courses') {
      return (
        pathname.startsWith('/student/courses') &&
        !pathname.startsWith('/student/browse-courses')
      );
    }
    if (href === RECORDED_COURSES_CATALOG_HREF) {
      return pathname.startsWith('/courses');
    }
    if (href === '/student/profile') {
      return pathname.startsWith('/student/profile');
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      console.log('You have been logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    const typedUser = user as any;
    const fullName = typedUser?.name?.trim();
    if (fullName) {
      return fullName;
    }
    if (user?.name) {
      return user.name;
    }
    return user?.email?.split('@')[0] || 'Student';
  };

  return (
    <Sidebar 
      variant="inset" 
      collapsible="icon"
      className="relative border-r border-gray-800 w-full sm:w-80 bg-black border-b sm:border-b-0 transition-all duration-300 ease-in-out md:p-0 [&>[data-sidebar=sidebar]]:bg-black"
    >

      <SidebarHeader className="rounded-b-2xl border-b border-gray-200 bg-white transition-all duration-300">
        <div className="space-y-3 px-4 py-4">
          <DashboardSidebarBrand />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-black overflow-hidden">
        {menuItems.map((category, categoryIndex) => (
          <SidebarGroup key={categoryIndex} className="mb-4 last:mb-0">
            <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4 hidden sm:block">
              {category.category}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 px-2">
                {category.items.map((item, itemIndex) => {
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={itemIndex}>
                      <SidebarMenuButton 
                        isActive={active}
                        tooltip={item.label}
                        onClick={() => item.href && router.push(item.href)}
                        className={`
                          group relative transition-all duration-200 rounded-lg cursor-pointer py-3 px-3
                          ${active 
                            ? 'bg-green-900/30 text-green-300 border-l-4 border-green-400' 
                            : 'hover:bg-gray-800 text-gray-300 hover:text-white'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={`
                            flex items-center justify-center w-5 h-5 transition-colors duration-200 flex-shrink-0
                            ${active ? 'text-green-300' : 'text-gray-400 group-hover:text-gray-300'}
                          `}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <span className={`font-medium text-sm truncate ${active ? 'text-green-200' : ''}`}>{item.label}</span>
                            {item.badge && (
                              <span 
                                className={`ml-2 px-2 py-0.5 text-xs font-medium text-white rounded-full min-w-[1.25rem] h-5 flex items-center justify-center ${
                                  item.label === 'Exams' 
                                    ? 'bg-orange-500 animate-pulse' 
                                    : item.label === 'Exam History'
                                    ? 'bg-blue-500'
                                    : 'bg-green-600'
                                }`}
                                title={
                                  item.label === 'Exams' 
                                    ? `${item.badge} exam${item.badge !== '1' ? 's' : ''} in progress`
                                    : item.label === 'Exam History'
                                    ? `${item.badge} completed exam${item.badge !== '1' ? 's' : ''}`
                                    : `${item.badge} notification${item.badge !== '1' ? 's' : ''}`
                                }
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Active state glow effect */}
                        {active && (
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg" />
                        )}
                        
                        {/* Active state indicator dot */}
                        {active && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter className="rounded-t-2xl border-t border-gray-200 bg-white transition-all duration-300">
        <div className="p-4">
          {/* Action Buttons */}
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Logout" 
                onClick={handleLogout}
                disabled={isLoading}
                className="group relative transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5 transition-colors duration-200 text-red-400 group-hover:text-red-300 flex-shrink-0">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-red-400 border-t-red-200 rounded-full animate-spin"></div>
                    ) : (
                      <LuLogOut className="w-5 h-5" />
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {isLoading ? 'Logging out...' : 'Logout'}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
};

export default StudentSidebar;
