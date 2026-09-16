'use client';

import type { WebsiteContent } from './types';
import { defaultWebsiteContent } from '@/lib/websiteContentDefaults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { LuPlus as Plus, LuTrash2 as Trash, LuGlobe as Globe, LuSettings as Settings } from 'react-icons/lu';

interface NavigationSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  activeSubTab: 'navigation' | 'buttons' | 'mobile';
  onSubTabChange: (tab: 'navigation' | 'buttons' | 'mobile') => void;
}

export function NavigationSection({
  content,
  updateContent,
  activeSubTab,
  onSubTabChange,
}: NavigationSectionProps) {
  const headerItems =
    content.mobileMenu?.items?.length > 0
      ? content.mobileMenu.items
      : defaultWebsiteContent.mobileMenu.items;

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
        {([
          { id: 'navigation' as const, label: 'Header Links' },
          { id: 'buttons' as const, label: 'Buttons' },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSubTabChange(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === tab.id
                ? 'bg-[#7B2CBF]/10 text-[#7B2CBF]'
                : 'text-gray-600 hover:text-[#7B2CBF] hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeSubTab === 'navigation' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Header navigation links
                </CardTitle>
                <CardDescription>
                  These links appear in the site header (desktop and mobile). Same
                  list as the public frontend menu.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  updateContent(
                    ['mobileMenu', 'items'],
                    [...headerItems, { label: '', href: '' }],
                  );
                }}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {headerItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border p-3"
              >
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const newItems = [...headerItems];
                      newItems[index] = {
                        ...newItems[index],
                        label: e.target.value,
                      };
                      updateContent(['mobileMenu', 'items'], newItems);
                    }}
                    placeholder="Label"
                  />
                  <Input
                    value={item.href}
                    onChange={(e) => {
                      const newItems = [...headerItems];
                      newItems[index] = {
                        ...newItems[index],
                        href: e.target.value,
                      };
                      updateContent(['mobileMenu', 'items'], newItems);
                    }}
                    placeholder="/path"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    updateContent(
                      ['mobileMenu', 'items'],
                      headerItems.filter((_, i) => i !== index),
                    );
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Button Settings
            </CardTitle>
            <CardDescription>Configure header sign-in and CTA buttons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">
                    Enable Live Course Button
                  </label>
                  <p className="text-sm text-gray-500">
                    Show/hide the live course button
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateContent(
                      ['buttons', 'liveCourse', 'enabled'],
                      !content.buttons.liveCourse.enabled,
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    content.buttons.liveCourse.enabled
                      ? 'bg-[#7B2CBF]'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      content.buttons.liveCourse.enabled
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Live Course Button Text
                </label>
                <Input
                  value={content.buttons.liveCourse.text}
                  onChange={(e) =>
                    updateContent(['buttons', 'liveCourse', 'text'], e.target.value)
                  }
                />
              </div>
              {content.buttons.liveCourse.href !== undefined && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Live Course Button URL
                  </label>
                  <Input
                    value={content.buttons.liveCourse.href || ''}
                    onChange={(e) =>
                      updateContent(
                        ['buttons', 'liveCourse', 'href'],
                        e.target.value,
                      )
                    }
                    placeholder="/courses"
                  />
                </div>
              )}
            </div>
            <Separator />
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Sign in Button Text
              </label>
              <Input
                value={content.buttons.login.text}
                onChange={(e) =>
                  updateContent(['buttons', 'login', 'text'], e.target.value)
                }
                placeholder="Sign in"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Sign in Button URL
              </label>
              <Input
                value={content.buttons.login.href}
                onChange={(e) =>
                  updateContent(['buttons', 'login', 'href'], e.target.value)
                }
                placeholder="/login"
              />
            </div>
            <Separator />
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Register / Join CTA Text
              </label>
              <Input
                value={
                  content.navigation.account.items.find(
                    (i) => i.href === '/register',
                  )?.label ?? 'Join for free'
                }
                onChange={(e) => {
                  const items = [...content.navigation.account.items];
                  const idx = items.findIndex((i) => i.href === '/register');
                  if (idx >= 0) {
                    items[idx] = { ...items[idx], label: e.target.value };
                  } else {
                    items.push({ label: e.target.value, href: '/register' });
                  }
                  updateContent(['navigation', 'account', 'items'], items);
                }}
                placeholder="Join for free"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
