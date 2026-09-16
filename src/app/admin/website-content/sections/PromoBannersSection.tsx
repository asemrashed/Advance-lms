'use client';

import type { WebsiteContent } from './types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Checkbox } from '@/components/ui/checkbox';
import { LuImage as ImageIcon } from 'react-icons/lu';
import { defaultCourseLessonBannerContent, defaultPromoBannerContent } from '@/lib/websiteContentDefaults';
import { CmsImageField } from './CmsImageField';
interface PromoBannersSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  activeSubTab: 'promoBanner' | 'courseLessonBanner';
  onSubTabChange: (tab: 'promoBanner' | 'courseLessonBanner') => void;
}

export function PromoBannersSection({ content, updateContent, activeSubTab, onSubTabChange }: PromoBannersSectionProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
        {([
          { id: 'promoBanner' as const, label: 'Promotional Banner' },
          { id: 'courseLessonBanner' as const, label: 'Course Lesson Banner' },
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
      {activeSubTab === 'promoBanner' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Promotional Banner
                      </CardTitle>
                      <CardDescription>Configure the promotional banner shown on the student portal My Courses page</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="promoBannerEnabled"
                          checked={content.promotionalBanner?.enabled ?? true}
                          onCheckedChange={(checked) => updateContent(['promotionalBanner', 'enabled'], checked === true)}
                        />
                        <label htmlFor="promoBannerEnabled" className="text-sm font-medium cursor-pointer">Show promotional banner on My Courses page</label>
                      </div>
                      <CmsImageField
                        label="Banner image (optional)"
                        value={content.promotionalBanner?.imageUrl ?? ''}
                        onChange={(url) => updateContent(['promotionalBanner', 'imageUrl'], url)}
                        placeholder="https://example.com/banner.jpg"
                        hint="Leave empty to use a gradient background."
                      />
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Link URL (when banner is clicked)</label>
                        <Input
                          value={content.promotionalBanner?.link ?? '/#courses'}
                          onChange={(e) => updateContent(['promotionalBanner', 'link'], e.target.value)}
                          placeholder="/#courses or /all-courses"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Headline</label>
                        <AttractiveInput
                          value={content.promotionalBanner?.headline ?? defaultPromoBannerContent.headline}
                          onChange={(e) => updateContent(['promotionalBanner', 'headline'], e.target.value)}
                          placeholder="e.g. আরও কোর্স এক্সপ্লোর করুন"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Subtext</label>
                        <AttractiveInput
                          value={content.promotionalBanner?.subtext ?? defaultPromoBannerContent.subtext}
                          onChange={(e) => updateContent(['promotionalBanner', 'subtext'], e.target.value)}
                          placeholder="e.g. নতুন কোর্সে বিশেষ ছাড় পেতে এখনই দেখুন"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">CTA button label</label>
                        <Input
                          value={content.promotionalBanner?.ctaLabel ?? defaultPromoBannerContent.ctaLabel}
                          onChange={(e) => updateContent(['promotionalBanner', 'ctaLabel'], e.target.value)}
                          placeholder="e.g. দেখুন"
                          className="w-full max-w-xs"
                        />
                      </div>
                    </CardContent>
                  </Card>
      ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Course Lesson Banner
                      </CardTitle>
                      <CardDescription>Configure the image/title banner shown in My Course lesson page above the video</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="courseLessonBannerEnabled"
                          checked={content.courseLessonBanner?.enabled ?? true}
                          onCheckedChange={(checked) => updateContent(['courseLessonBanner', 'enabled'], checked === true)}
                        />
                        <label htmlFor="courseLessonBannerEnabled" className="text-sm font-medium cursor-pointer">Show lesson banner on My Course lesson page</label>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Banner title</label>
                        <AttractiveInput
                          value={content.courseLessonBanner?.title ?? defaultCourseLessonBannerContent.title}
                          onChange={(e) => updateContent(['courseLessonBanner', 'title'], e.target.value)}
                          placeholder="e.g. আজকের লেসনে স্বাগতম"
                        />
                      </div>
                      <CmsImageField
                        label="Banner image"
                        value={content.courseLessonBanner?.imageUrl ?? ''}
                        onChange={(url) => updateContent(['courseLessonBanner', 'imageUrl'], url)}
                        placeholder="https://example.com/lesson-banner.jpg"
                      />
                    </CardContent>
                  </Card>
      )}
    </>
  );
}
