'use client';

import { LuLayoutDashboard, LuBookOpen as BookOpen, LuUsers as Users, LuMessageSquare as MessageSquare, LuStar as Star, LuSettings as Settings, LuLogOut, LuGraduationCap as GraduationCap, LuFileText as LuFileText, LuChartBar, LuCalendar as Calendar, LuBell, LuAward as Award, LuBookmark, LuClipboardList, LuUserCheck as UserCheck, LuTrendingUp as TrendingUp, LuShield as Shield, LuTag as Tag, LuLayers as Layers, LuPlay as PlayCircle, LuFileCheck, LuTarget as Target, LuDatabase, LuGlobe as Globe, LuMegaphone } from 'react-icons/lu';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/authSlice';
import { useMemo } from 'react';

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



const AppSidebar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const adminDashboard = useAppSelector((state) => state.dashboard.admin);

  const badges = useMemo(() => {
    const overview = adminDashboard?.overview;
    return {
      courses: Number(overview?.totalCourses ?? 0),
      categories: 0,
      students: Number(overview?.totalStudents ?? 0),
      teachers: Number(overview?.totalTeachers ?? 0),
      enrollments: Number(overview?.totalEnrollments ?? 0),
      pastPapers: 0,
      exams: Array.isArray(adminDashboard?.examStats) ? adminDashboard.examStats.length : 0,
      assignments: 0,
    };
  }, [adminDashboard]);

  const isDataLoading = !adminDashboard;

  const menuItems = [
    {
      category: 'Main',
      items: [
        { 
          icon: LuLayoutDashboard, 
          label: 'Dashboard', 
          href: '/admin/dashboard',
          description: 'Overview & insights',
          badge: null
        },
        // { 
        //   icon: Calendar, 
        //   label: 'Schedule', 
        //   href: '/admin/schedule',
        //   description: 'Classes & events',
        //   badge: '2'
        // },
        // { 
        //   icon: LuBell, 
        //   label: 'Notifications', 
        //   href: '/admin/notifications',
        //   description: 'Alerts & updates',
        //   badge: '5'
        // },
      ]
    },
    {
      category: 'Learning',
      items: [
        { 
          icon: BookOpen, 
          label: 'Courses', 
          href: '/admin/courses',
          description: 'Manage courses & content',
          badge: badges.courses > 0 ? badges.courses.toString() : null
        },
        { 
          icon: Tag, 
          label: 'Subjects', 
          href: '/admin/subjects',
          description: 'Syllabus subjects (name + code)',
          badge: badges.categories > 0 ? badges.categories.toString() : null
        },
        // { 
        //   icon: Layers, 
        //   label: 'Chapters', 
        //   href: '/admin/chapters',
        //   description: 'Course chapters',
        //   badge: null
        // },
        // { 
        //   icon: PlayCircle, 
        //   label: 'Lessons', 
        //   href: '/admin/lessons',
        //   description: 'Course lessons',
        //   badge: null
        // },
        { 
          icon: LuFileText, 
          label: 'Assignments', 
          href: '/admin/assignments',
          description: 'Tasks & projects',
          badge: badges.assignments > 0 ? badges.assignments.toString() : null
        },
        { 
          icon: LuBookmark, 
          label: 'Past Papers', 
          href: '/admin/past-papers',
          description: 'Question papers & solutions',
          badge: badges.pastPapers > 0 ? badges.pastPapers.toString() : null
        },
        { 
          icon: LuFileCheck, 
          label: 'Exams', 
          href: '/admin/exams',
          description: 'Create & manage exams',
          badge: badges.exams > 0 ? badges.exams.toString() : null
        },
        { 
          icon: LuDatabase, 
          label: 'Question Bank', 
          href: '/admin/question-bank',
          description: 'Manage question library',
          badge: null
        },
      ]
    },
    {
      category: 'People',
      items: [
        { 
          icon: Users, 
          label: 'Students', 
          href: '/admin/students',
          description: 'Student management',
          badge: badges.students > 0 ? badges.students.toString() : null
        },
        { 
          icon: GraduationCap, 
          label: 'Teachers', 
          href: '/admin/teachers',
          description: 'Instructor management',
          badge: badges.teachers > 0 ? badges.teachers.toString() : null
        },
        { 
          icon: UserCheck, 
          label: 'Enrollments', 
          href: '/admin/enrollments',
          description: 'Student course enrollments',
          badge: badges.enrollments > 0 ? badges.enrollments.toString() : null
        },
      ]
    },
    {
      category: 'Communication',
      items: [
        { 
          icon: Star, 
          label: 'Reviews', 
          href: '/admin/reviews',
          description: 'Feedback & ratings',
          badge: null
        },
        {
          icon: LuMegaphone,
          label: 'Notice Board',
          href: '/admin/notices',
          description: 'Announcements & moderation',
          badge: null,
        },
        {
          icon: LuFileText,
          label: 'Blog',
          href: '/admin/blog',
          description: 'Posts & categories',
          badge: null,
        },
        // { 
        //   icon: MessageSquare, 
        //   label: 'Messages', 
        //   href: '/admin/messages',
        //   description: 'Direct messages',
        //   badge: '3'
        // },
        // { 
        //   icon: HelpCircle, 
        //   label: 'Support', 
        //   href: '/admin/support',
        //   description: 'Help & tickets',
        //   badge: '4'
        // },
      ]
    },
    // {
    //   category: 'Analytics',
    //   items: [
    //     { 
    //       icon: LuChartBar, 
    //       label: 'Analytics', 
    //       href: '/admin/analytics',
    //       description: 'Performance metrics',
    //       badge: null
    //     },
    //     { 
    //       icon: TrendingUp, 
    //       label: 'Reports', 
    //       href: '/admin/reports',
    //       description: 'Detailed reports',
    //       badge: null
    //     },
    //   ]
    // },
    {
      category: 'System',
      items: [
        { 
          icon: Globe, 
          label: 'Website Content', 
          href: '/admin/website-content',
          description: 'Manage header & content',
          badge: null
        },
      ]
    }
  ];

  // Function to check if a menu item is active
  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    // Special handling for course materials / legacy builder
    if (
      href === '/admin/courses' &&
      (pathname.startsWith('/admin/courses/builder') ||
        pathname.startsWith('/admin/materials') ||
        pathname.startsWith('/admin/courses/create') ||
        pathname.match(/^\/admin\/courses\/[^/]+\/edit/))
    ) {
      return true;
    }
    // Special handling for enrollments
    if (href === '/admin/enrollments') {
      return pathname.startsWith('/admin/enrollments');
    }
    // Special handling for question bank
    if (href === '/admin/question-bank') {
      return pathname.startsWith('/admin/question-bank');
    }
    // Special handling for assignments
    if (href === '/admin/assignments') {
      return pathname.startsWith('/admin/assignments');
    }
    // Special handling for website content
    if (href === '/admin/website-content') {
      return pathname.startsWith('/admin/website-content');
    }
    // Special handling for settings
    if (href === '/admin/settings') {
      return pathname.startsWith('/admin/settings');
    }
    if (href === '/instructor/settings') {
      return pathname.startsWith('/instructor/settings');
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
    if (user?.name) {
      return user.name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    if (user?.role) {
      return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }
    return 'User';
  };

  return (
    <Sidebar 
      variant="inset" 
      collapsible="icon"
      className="relative w-full border-b border-primary/15 bg-white transition-all duration-300 ease-in-out sm:w-80 sm:border-b-0"
    >


      <SidebarHeader className="rounded-b-2xl border-b border-primary/15 bg-white transition-all duration-300">
        <div className="px-4 py-4 space-y-3">
          <DashboardSidebarBrand />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="admin-sidebar-content" style={{ backgroundColor: '#FFFFFF' }}>
        {menuItems.map((category, categoryIndex) => (
          <SidebarGroup key={categoryIndex} className="mb-4 last:mb-0">
            <SidebarGroupLabel className="mb-3 hidden px-4 text-xs font-semibold uppercase tracking-wider text-primary/60 sm:block">
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
                        className={`group relative cursor-pointer rounded-lg px-3 py-3 transition-all duration-200 ${
                          active
                            ? 'border-l-4 border-primary bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex w-full items-center gap-3">
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${
                            active ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div className="flex min-w-0 flex-1 items-center justify-between">
                            <span className={`truncate text-sm font-medium ${
                              active ? 'text-primary' : 'text-foreground'
                            }`}>{item.label}</span>
                            {item.badge && (
                              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                {item.badge}
                              </span>
                            )}
                            {isDataLoading && !item.badge && (
                              <span className="ml-2 h-4 w-4 animate-pulse rounded-full bg-primary/30" />
                            )}
                          </div>
                        </div>
                        
                        {active && (
                          <>
                            <div className="absolute inset-0 rounded-lg bg-primary/5" />
                            <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                          </>
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
      
      <SidebarFooter className="rounded-t-2xl border-t border-primary/15 bg-white transition-all duration-300">
        <div className="p-4">
          {/* Action Buttons */}
          <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Settings"
                onClick={() => router.push(user?.role === 'instructor' ? '/instructor/settings' : '/admin/settings')}
                className={`group relative rounded-lg transition-all duration-200 ${
                  pathname.startsWith('/admin/settings') || pathname.startsWith('/instructor/settings')
                    ? 'border-l-4 border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${
                    pathname.startsWith('/admin/settings') || pathname.startsWith('/instructor/settings')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}>
                    <Settings className="h-5 w-5" />
                  </div>
                  <span className={`text-sm font-medium ${
                    pathname.startsWith('/admin/settings') || pathname.startsWith('/instructor/settings')
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}>Settings</span>
                </div>
                
                {(pathname.startsWith('/admin/settings') || pathname.startsWith('/instructor/settings')) && (
                  <>
                    <div className="absolute inset-0 rounded-lg bg-primary/5" />
                    <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                tooltip="Logout" 
                onClick={handleLogout}
                disabled={isLoading}
                className="group relative transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: '#EF4444',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#F87171';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#EF4444';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5 transition-colors duration-200 flex-shrink-0" style={{
                    color: isLoading ? 'rgba(239, 68, 68, 0.5)' : '#EF4444',
                  }}>
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        borderTopColor: '#EF4444',
                      }}></div>
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

export default AppSidebar;
