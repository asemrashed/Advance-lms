'use client';

import { useEffect, useState } from 'react';
import {
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuPanelRightClose,
  LuPanelRightOpen,
} from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CmsSidebarNav } from './CmsSidebarNav';
import type { CmsSidebarGroup } from './cmsSidebarConfig';

interface CmsSectionsLayoutProps {
  groups: CmsSidebarGroup[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function CmsSectionsLayout({
  groups,
  activeTab,
  onSelectTab,
  children,
  className,
}: CmsSectionsLayoutProps) {
  const isMobile = useIsMobile();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen((open) => !open);
    } else {
      setDesktopCollapsed((c) => !c);
    }
  };

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const renderHeader = (iconOnly: boolean, fromRight = false) => {
    const OpenIcon = fromRight ? LuPanelRightOpen : LuPanelLeftOpen;
    const CloseIcon = fromRight ? LuPanelRightClose : LuPanelLeftClose;

    return (
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-2 py-2.5">
        <div className="truncate text-sm font-semibold text-gray-900">Management</div>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-[#7B2CBF]/10 hover:text-[#7B2CBF]"
          aria-label={iconOnly ? 'Open section menu' : 'Collapse section menu'}
          aria-expanded={isMobile ? mobileOpen : !desktopCollapsed}
        >
          {iconOnly ? (
            <OpenIcon className="size-5" />
          ) : (
            <CloseIcon className="size-5" />
          )}
        </button>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-col md:flex-row md:overflow-hidden',
          className,
        )}
      >
        {!isMobile && (
          <aside
            className={cn(
              'hidden shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out md:flex md:h-full',
              desktopCollapsed ? 'w-14' : 'w-[220px]',
            )}
          >
            {renderHeader(desktopCollapsed)}
            <CmsSidebarNav
              groups={groups}
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              collapsed={desktopCollapsed}
              className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
            />
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          {isMobile && (
            <div className="mb-2 shrink-0 md:hidden">{renderHeader(true, true)}</div>
          )}

          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="right" className="w-[min(280px,85vw)] gap-0 p-0">
                <SheetTitle className="sr-only">Section management</SheetTitle>
                {renderHeader(false, true)}
                <CmsSidebarNav
                  groups={groups}
                  activeTab={activeTab}
                  onSelectTab={handleSelectTab}
                  collapsed={false}
                  className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
                />
              </SheetContent>
            </Sheet>
          )}

          <div className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </TooltipProvider>
  );
}
