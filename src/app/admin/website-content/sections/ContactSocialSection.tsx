'use client';

import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LuPhone as Phone, LuLink as LinkIcon } from 'react-icons/lu';

interface ContactSocialSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  activeSubTab: 'contact' | 'social';
  onSubTabChange: (tab: 'contact' | 'social') => void;
}

export function ContactSocialSection({ content, updateContent, activeSubTab, onSubTabChange }: ContactSocialSectionProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-6">
        {([
          { id: 'contact' as const, label: 'Contact Info' },
          { id: 'social' as const, label: 'Social Media' },
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
      {activeSubTab === 'contact' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Registration Information
                      </CardTitle>
                      <CardDescription>Update government registration number displayed in header</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                        <label className="text-sm font-semibold mb-2 block">Registration Number</label>
                          <Input
                          value={content.contact?.registrationNumber || ''}
                          onChange={(e) => updateContent(['contact', 'registrationNumber'], e.target.value)}
                          placeholder="বাংলাদেশ সরকার অনুমোদিত রেজিঃ নং- ৩১১০৫"
                          className="w-full"
                          />
                        <p className="text-xs text-gray-500 mt-2">
                          This text will be displayed in the subheader section of the website
                        </p>
                      </div>
                    </CardContent>
                  </Card>
      ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Social Media Links
                      </CardTitle>
                      <CardDescription>Configure social media profile URLs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Facebook URL</label>
                        <Input
                          value={content.socialMedia.facebook}
                          onChange={(e) => updateContent(['socialMedia', 'facebook'], e.target.value)}
                          placeholder="https://facebook.com/yourpage"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">Twitter/X URL</label>
                        <Input
                          value={content.socialMedia.twitter}
                          onChange={(e) => updateContent(['socialMedia', 'twitter'], e.target.value)}
                          placeholder="https://twitter.com/yourhandle"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block">LinkedIn URL</label>
                        <Input
                          value={content.socialMedia.linkedin}
                          onChange={(e) => updateContent(['socialMedia', 'linkedin'], e.target.value)}
                          placeholder="https://linkedin.com/company/yourcompany"
                        />
                      </div>
                      {content.socialMedia.instagram && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">Instagram URL</label>
                          <Input
                            value={content.socialMedia.instagram}
                            onChange={(e) => updateContent(['socialMedia', 'instagram'], e.target.value)}
                            placeholder="https://instagram.com/yourhandle"
                          />
                        </div>
                      )}
                      {content.socialMedia.youtube && (
                        <div>
                          <label className="text-sm font-semibold mb-2 block">YouTube URL</label>
                          <Input
                            value={content.socialMedia.youtube}
                            onChange={(e) => updateContent(['socialMedia', 'youtube'], e.target.value)}
                            placeholder="https://youtube.com/@yourchannel"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
      )}
    </>
  );
}
