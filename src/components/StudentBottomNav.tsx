'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LuLayoutDashboard as Dashboard, LuBookOpen as BookOpen, LuFileText as FileText } from 'react-icons/lu';

const navItems = [
  { href: '/student/dashboard', label: 'Dashboard', icon: Dashboard },
  { href: '/student/courses', label: 'My Courses', icon: BookOpen },
  { href: '/student/assignments', label: 'Assignments', icon: FileText },
];

export default function StudentBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/student/dashboard') return pathname === '/student/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors min-w-0 ${
                active
                  ? 'text-[#7B2CBF]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className="w-6 h-6 shrink-0"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-xs font-medium truncate max-w-full px-1">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
