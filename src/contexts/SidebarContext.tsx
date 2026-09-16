'use client';

/**
 * SidebarContext — re-exports the shadcn useSidebar hook so any component
 * can import sidebar state (open, isMobile, toggleSidebar, etc.) from
 * the contexts directory rather than digging into ui/sidebar.
 */
export { useSidebar } from '@/components/ui/sidebar';
