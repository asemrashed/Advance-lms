'use client';

import type { WebsiteContent } from './types';
import { defaultAboutPageContent } from '@/lib/websiteContentDefaults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { CmsImageField } from './CmsImageField';
import { LuInfo as Info } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

interface AboutSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  onManageFeatures?: () => void;
}

export function AboutSection({
  content,
  updateContent,
  onManageFeatures,
}: AboutSectionProps) {
  const page = {
    ...defaultAboutPageContent,
    ...(content.aboutPage ?? {}),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          About Page
        </CardTitle>
        <CardDescription>Content shown on the public /about page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold">Page heading</label>
          <AttractiveInput
            value={page.heading}
            onChange={(e) => updateContent(['aboutPage', 'heading'], e.target.value)}
            placeholder="The digital elite knowledge platform"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Page description</label>
          <textarea
            value={page.description}
            onChange={(e) => updateContent(['aboutPage', 'description'], e.target.value)}
            placeholder="Short hero description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">About us content</label>
          <textarea
            value={page.aboutContent}
            onChange={(e) => updateContent(['aboutPage', 'aboutContent'], e.target.value)}
            placeholder="Main about body text"
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
          />
        </div>
        <CmsImageField
          label="About us image"
          value={page.imageUrl}
          onChange={(url) => updateContent(['aboutPage', 'imageUrl'], url)}
          previewAlt="About page"
        />

        <div className="rounded-lg border border-dashed border-[#7B2CBF]/30 bg-[#7B2CBF]/5 p-4">
          <p className="text-sm text-gray-700">
            The features grid on the public about page uses the same content as the home
            features section. Edit headings, icons, and feature cards in the Features tab.
          </p>
          {onManageFeatures ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onManageFeatures}
            >
              Open Features tab
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
