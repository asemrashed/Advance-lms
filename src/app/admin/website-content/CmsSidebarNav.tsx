'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isCmsTabActive, type CmsSidebarGroup } from './cmsSidebarConfig';

interface CmsSidebarNavProps {
  groups: CmsSidebarGroup[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  collapsed?: boolean;
  className?: string;
}

export function CmsSidebarNav({
  groups,
  activeTab,
  onSelectTab,
  collapsed = false,
  className,
}: CmsSidebarNavProps) {
  return (
    <nav
      className={`px-1 py-2 ${className ?? 'flex-1 overflow-y-auto'}`}
      aria-label="CMS content sections"
    >
      {groups.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          {!collapsed && (
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[#7B2CBF]/60">
              {group.label}
            </p>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isCmsTabActive(activeTab, item.id);
              const button = (
                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium transition-all ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'border-l-4 border-[#A855F7] bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-[#EC4899]'
                      : item.dimmed
                        ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                        : 'text-gray-600 hover:bg-[#7B2CBF]/5 hover:text-[#7B2CBF]'
                  }`}
                >
                  <Icon
                    className={`size-4 shrink-0 ${isActive ? 'text-[#EC4899]' : 'text-gray-400'}`}
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className={`shrink-0 px-1.5 py-0 text-[10px] ${
                            item.badge === 'Coming Soon'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-gray-200 bg-gray-50 text-gray-500'
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
              return (
                <li key={item.id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
