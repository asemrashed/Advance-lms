'use client';

import { useState } from 'react';
import type { WebsiteContent } from './types';
import { defaultPartnersContent } from '@/lib/websiteContentDefaults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuPlus as Plus, LuTrash2 as Trash, LuBriefcase as Briefcase } from 'react-icons/lu';
import { websiteContentAdminService } from '@/services/websiteContentAdminService';

interface PartnersSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

export function PartnersSection({ content, updateContent }: PartnersSectionProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const partners = content.partners ?? defaultPartnersContent;
  const items =
    partners.items?.length > 0 ? partners.items : defaultPartnersContent.items;

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('file', file);
      const response = await websiteContentAdminService.uploadCmsImage(formData);
      const data = await response.json();
      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error || 'Failed to upload image');
      }
      const updated = [...items];
      updated[index] = { ...updated[index], imageUrl: data.imageUrl };
      updateContent(['partners', 'items'], updated);
    } catch (error) {
      console.error('Partner image upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingIndex(null);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Partners
        </CardTitle>
        <CardDescription>
          Partner logos shown on the home page (image + optional link)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-semibold mb-2 block">Section title</label>
          <Input
            value={partners.title || defaultPartnersContent.title}
            onChange={(e) => updateContent(['partners', 'title'], e.target.value)}
            placeholder="Our Trusted Partners & Integrations"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Partner items</label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              updateContent(
                ['partners', 'items'],
                [...items, { name: '', imageUrl: '', href: '' }],
              );
            }}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Partner
          </Button>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <PartnerItemEditor
              key={index}
              item={item}
              index={index}
              uploading={uploadingIndex === index}
              onNameChange={(value) => {
                const updated = [...items];
                updated[index] = { ...updated[index], name: value };
                updateContent(['partners', 'items'], updated);
              }}
              onHrefChange={(value) => {
                const updated = [...items];
                updated[index] = { ...updated[index], href: value };
                updateContent(['partners', 'items'], updated);
              }}
              onImageUpload={(e) => handleImageUpload(e, index)}
              onClearImage={() => {
                const updated = [...items];
                updated[index] = { ...updated[index], imageUrl: '' };
                updateContent(['partners', 'items'], updated);
              }}
              onRemove={() => {
                updateContent(
                  ['partners', 'items'],
                  items.filter((_, i) => i !== index),
                );
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PartnerItemEditor({
  item,
  index,
  uploading,
  onNameChange,
  onHrefChange,
  onImageUpload,
  onClearImage,
  onRemove,
}: {
  item: { name: string; imageUrl: string; href: string };
  index: number;
  uploading: boolean;
  onNameChange: (value: string) => void;
  onHrefChange: (value: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Partner {index + 1}
        </span>
        <Button size="sm" variant="ghost" onClick={onRemove} className="text-red-600">
          <Trash className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          value={item.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name (fallback if no image)"
        />
        <Input
          value={item.href}
          onChange={(e) => onHrefChange(e.target.value)}
          placeholder="Link URL (optional)"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name || `Partner ${index + 1}`}
            className="h-12 w-auto max-w-[8rem] rounded border object-contain bg-white p-1"
          />
        ) : (
          <div className="flex h-12 w-24 items-center justify-center rounded border bg-gray-50 text-xs text-gray-500">
            No image
          </div>
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          disabled={uploading}
          className="max-w-xs"
        />
        {item.imageUrl ? (
          <Button type="button" variant="outline" size="sm" onClick={onClearImage}>
            Remove image
          </Button>
        ) : null}
        {uploading ? (
          <span className="text-xs text-gray-500">Uploading...</span>
        ) : null}
      </div>
    </div>
  );
}
