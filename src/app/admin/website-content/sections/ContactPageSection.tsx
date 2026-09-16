'use client';

import { useState } from 'react';
import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import {
  defaultContactPageContent,
  defaultWebsiteContent,
} from '@/lib/websiteContentDefaults';
import { LuLink as LinkIcon, LuPhone as Phone } from 'react-icons/lu';

interface ContactPageSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

type ContactSubTab = 'contact' | 'social';

export function ContactPageSection({ content, updateContent }: ContactPageSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<ContactSubTab>('contact');
  const page = {
    ...defaultContactPageContent,
    ...(content.contactPage ?? {}),
  };
  const social = {
    ...defaultWebsiteContent.socialMedia,
    ...(content.socialMedia ?? {}),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Contact Page
        </CardTitle>
        <CardDescription>
          Manage contact page content and social profile links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ContactSubNav activeSubTab={activeSubTab} onSelect={setActiveSubTab} />

        {activeSubTab === 'contact' ? (
          <ContactFieldsPanel content={content} page={page} updateContent={updateContent} />
        ) : (
          <SocialFieldsPanel social={social} updateContent={updateContent} />
        )}
      </CardContent>
    </Card>
  );
}

function ContactSubNav({
  activeSubTab,
  onSelect,
}: {
  activeSubTab: ContactSubTab;
  onSelect: (tab: ContactSubTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
      {([
        { id: 'contact' as const, label: 'Contact Info' },
        { id: 'social' as const, label: 'Social Links' },
      ]).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeSubTab === tab.id
              ? 'bg-[#7B2CBF]/10 text-[#7B2CBF]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-[#7B2CBF]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ContactFieldsPanel({
  content,
  page,
  updateContent,
}: {
  content: WebsiteContent;
  page: typeof defaultContactPageContent;
  updateContent: (path: string[], value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold">Headline</label>
        <AttractiveInput
          value={page.headline}
          onChange={(e) => updateContent(['contactPage', 'headline'], e.target.value)}
          placeholder="Get in Touch"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Subheadline</label>
        <AttractiveInput
          value={page.subheadline}
          onChange={(e) => updateContent(['contactPage', 'subheadline'], e.target.value)}
          placeholder="Short intro text"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Phone number</label>
        <Input
          value={page.phone}
          onChange={(e) => updateContent(['contactPage', 'phone'], e.target.value)}
          placeholder="+880 ..."
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Email address</label>
        <Input
          type="email"
          value={page.email}
          onChange={(e) => updateContent(['contactPage', 'email'], e.target.value)}
          placeholder="contact@example.com"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Address</label>
        <AttractiveInput
          value={page.address}
          onChange={(e) => updateContent(['contactPage', 'address'], e.target.value)}
          placeholder="Street, city"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Map embed URL</label>
        <Input
          value={page.mapEmbedUrl}
          onChange={(e) => updateContent(['contactPage', 'mapEmbedUrl'], e.target.value)}
          placeholder="https://www.google.com/maps/embed?..."
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Registration number (site header)</label>
        <Input
          value={content.contact?.registrationNumber ?? ''}
          onChange={(e) => updateContent(['contact', 'registrationNumber'], e.target.value)}
          placeholder="Government registration number"
          className="w-full"
        />
        <p className="mt-2 text-xs text-gray-500">
          Optional text shown in the site subheader when configured.
        </p>
      </div>
    </div>
  );
}

function SocialFieldsPanel({
  social,
  updateContent,
}: {
  social: WebsiteContent['socialMedia'];
  updateContent: (path: string[], value: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-5 w-5 text-[#7B2CBF]" />
        <h3 className="text-sm font-semibold">Social profile URLs</h3>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Facebook URL</label>
        <Input
          value={social.facebook}
          onChange={(e) => updateContent(['socialMedia', 'facebook'], e.target.value)}
          placeholder="https://facebook.com/yourpage"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Twitter/X URL</label>
        <Input
          value={social.twitter}
          onChange={(e) => updateContent(['socialMedia', 'twitter'], e.target.value)}
          placeholder="https://twitter.com/yourhandle"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">LinkedIn URL</label>
        <Input
          value={social.linkedin}
          onChange={(e) => updateContent(['socialMedia', 'linkedin'], e.target.value)}
          placeholder="https://linkedin.com/company/yourcompany"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">Instagram URL</label>
        <Input
          value={social.instagram ?? ''}
          onChange={(e) => updateContent(['socialMedia', 'instagram'], e.target.value)}
          placeholder="https://instagram.com/yourhandle"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold">YouTube URL</label>
        <Input
          value={social.youtube ?? ''}
          onChange={(e) => updateContent(['socialMedia', 'youtube'], e.target.value)}
          placeholder="https://youtube.com/@yourchannel"
        />
      </div>
    </div>
  );
}
