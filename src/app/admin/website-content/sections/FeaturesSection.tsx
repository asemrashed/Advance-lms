'use client';

import type { WebsiteContent } from './types';
import {
  defaultFeaturesContent,
} from '@/lib/websiteContentDefaults';
import type { WhyChooseUsFeature } from '@/lib/websiteContentTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Button } from '@/components/ui/button';
import { CmsImageField } from './CmsImageField';
import { LuSparkles as Sparkles, LuPlus as Plus, LuTrash2 as Trash } from 'react-icons/lu';

const ICON_OPTIONS: Array<{
  value: WhyChooseUsFeature['iconType'];
  label: string;
}> = [
  { value: 'flexible', label: 'Learning paths (route)' },
  { value: 'instructor', label: 'Live sessions (video)' },
  { value: 'money', label: 'Dashboard' },
  { value: 'community', label: 'Community (groups)' },
];

interface FeaturesSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

export function FeaturesSection({ content, updateContent }: FeaturesSectionProps) {
  const section = {
    ...defaultFeaturesContent,
    ...(content.features ?? {}),
  };
  const items =
    section.features?.length > 0
      ? section.features
      : defaultFeaturesContent.features;

  const setFeatures = (next: WhyChooseUsFeature[]) => {
    updateContent(['features', 'features'], next);
  };

  const addFeature = () => {
    const maxId = items.reduce((m, f) => Math.max(m, f.id), 0);
    setFeatures([
      ...items,
      {
        id: maxId + 1,
        title: 'New feature',
        titleBn: 'New feature',
        description: 'Describe this feature.',
        descriptionBn: 'Describe this feature.',
        iconType: 'flexible',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Features
          </CardTitle>
          <CardDescription>
            Shown on the home page (side-by-side layout) and the about page (card grid).
            Also editable from About Page with a link to this tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">Section heading</label>
            <AttractiveInput
              value={section.sectionHeading ?? ''}
              onChange={(e) =>
                updateContent(['features', 'sectionHeading'], e.target.value)
              }
              placeholder="Powerful Features for an Elite Experience"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Section subtitle</label>
            <textarea
              value={section.sectionSubtitle ?? ''}
              onChange={(e) =>
                updateContent(['features', 'sectionSubtitle'], e.target.value)
              }
              placeholder="Short intro under the heading"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
            />
          </div>
          <CmsImageField
            label="Section image (home layout)"
            value={section.image ?? ''}
            onChange={(url) => updateContent(['features', 'image'], url)}
            previewAlt="Features"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Feature items</CardTitle>
            <CardDescription>Up to 8 items recommended for the about page grid.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addFeature}>
            <Plus className="mr-1 h-4 w-4" />
            Add feature
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((feature, index) => (
            <Card key={feature.id ?? index} className="border-dashed">
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Feature {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    title="Remove feature"
                    onClick={() => {
                      const next = items.filter((_, i) => i !== index);
                      setFeatures(
                        next.length > 0 ? next : defaultFeaturesContent.features,
                      );
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <AttractiveInput
                  value={feature.title}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...next[index], title: e.target.value };
                    setFeatures(next);
                  }}
                  placeholder="Feature title"
                />
                <textarea
                  value={feature.description}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...next[index],
                      description: e.target.value,
                      descriptionBn: e.target.value,
                    };
                    setFeatures(next);
                  }}
                  placeholder="Feature description"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
                />
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Icon</label>
                  <select
                    value={feature.iconType}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...next[index],
                        iconType: e.target.value as WhyChooseUsFeature['iconType'],
                      };
                      setFeatures(next);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
