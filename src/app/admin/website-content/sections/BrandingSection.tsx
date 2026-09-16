'use client';

import type React from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CustomEditor from '@/components/custom-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VideoWatermark from '@/components/VideoWatermark';
import {
  LuRefreshCw as RefreshCw,
  LuPlus as Plus,
  LuTrash2 as Trash,
  LuGlobe as Globe,
  LuPhone as Phone,
  LuMail as Mail,
  LuPalette as Palette,
  LuNavigation as Navigation,
  LuMessageSquare as MessageSquare,
  LuLink as LinkIcon,
  LuSettings as Settings,
  LuSparkles as Sparkles,
  LuInfo as Info,
  LuStar as Star,
  LuChartBar as BarChart,
  LuBriefcase as Briefcase,
  LuAward as Award,
  LuImage as ImageIcon,
  LuFileText as FileText,
  LuDownload as DownloadIcon,
  LuLayoutList as LayoutIcon,
  LuArrowUp,
  LuArrowDown,
  LuGripVertical,
  LuSearch as Search,
  LuLoader as Loader2,
  LuPlay as Play,
  LuEye as Eye,
} from 'react-icons/lu';
import {
  defaultSectionOrder,
} from '@/lib/websiteContentDefaults';
import type { WebsiteContent } from './types';


interface BrandingSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  uploadingAsset: 'logo' | 'favicon' | null;
  handleBrandingUpload: (event: React.ChangeEvent<HTMLInputElement>, assetType: 'logo' | 'favicon') => void;
}

export function BrandingSection({ content, updateContent, uploadingAsset, handleBrandingUpload }: BrandingSectionProps) {
  return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding & Logo
              </CardTitle>
              <CardDescription>Customize logo, favicon, meta title and brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Website Meta Title</label>
                <Input
                  value={content.metaTitle || ''}
                  onChange={(e) => updateContent(['metaTitle'], e.target.value)}
                  placeholder="Your institute website title"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold block">Logo</label>
                  {content.branding.logoUrl ? (
                    <img
                      src={content.branding.logoUrl}
                      alt="logo"
                      className="h-16 w-16 rounded border object-contain bg-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No logo
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.ico"
                      onChange={(e) => handleBrandingUpload(e, 'logo')}
                      disabled={uploadingAsset === 'logo'}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateContent(['branding', 'logoUrl'], '')}
                      disabled={!content.branding.logoUrl || uploadingAsset === 'logo'}
                    >
                      Remove
                    </Button>
                  </div>
                  {uploadingAsset === 'logo' && <p className="text-xs text-gray-500">Uploading logo...</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold block">Favicon</label>
                  {content.branding.faviconUrl ? (
                    <img
                      src={content.branding.faviconUrl}
                      alt="Website favicon"
                      className="h-16 w-16 rounded border object-contain bg-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                      No favicon
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.ico"
                      onChange={(e) => handleBrandingUpload(e, 'favicon')}
                      disabled={uploadingAsset === 'favicon'}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateContent(['branding', 'faviconUrl'], '')}
                      disabled={!content.branding.faviconUrl || uploadingAsset === 'favicon'}
                    >
                      Remove
                    </Button>
                  </div>
                  {uploadingAsset === 'favicon' && <p className="text-xs text-gray-500">Uploading favicon...</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Logo Text</label>
                <Input
                  value={content.branding.logoText}
                  onChange={(e) => updateContent(['branding', 'logoText'], e.target.value)}
                  placeholder="à¦®à§à¦¨à¦¾à¦®à¦¤à¦¿ à¦¸à¦¾à¦°à§à¦­à§ à¦à§à¦à¦¨à¦¿à¦à§à¦¯à¦¾à¦² à¦à§à¦°à§à¦¨à¦¿à¦ à¦à¦¨à¦¸à§à¦à¦¿à¦à¦¿à¦à¦"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Logo Text Color 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={content.branding.logoTextColor1}
                      onChange={(e) => updateContent(['branding', 'logoTextColor1'], e.target.value)}
                      className="h-10 w-20 rounded border"
                    />
                    <Input
                      value={content.branding.logoTextColor1}
                      onChange={(e) => updateContent(['branding', 'logoTextColor1'], e.target.value)}
                      placeholder="#7B2CBF"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Logo Text Color 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={content.branding.logoTextColor2}
                      onChange={(e) => updateContent(['branding', 'logoTextColor2'], e.target.value)}
                      className="h-10 w-20 rounded border"
                    />
                    <Input
                      value={content.branding.logoTextColor2}
                      onChange={(e) => updateContent(['branding', 'logoTextColor2'], e.target.value)}
                      placeholder="#FF6B35"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Logo Icon Color 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={content.branding.logoIconColor1}
                      onChange={(e) => updateContent(['branding', 'logoIconColor1'], e.target.value)}
                      className="h-10 w-20 rounded border"
                    />
                    <Input
                      value={content.branding.logoIconColor1}
                      onChange={(e) => updateContent(['branding', 'logoIconColor1'], e.target.value)}
                      placeholder="#FF6B35"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block">Logo Icon Color 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={content.branding.logoIconColor2}
                      onChange={(e) => updateContent(['branding', 'logoIconColor2'], e.target.value)}
                      className="h-10 w-20 rounded border"
                    />
                    <Input
                      value={content.branding.logoIconColor2}
                      onChange={(e) => updateContent(['branding', 'logoIconColor2'], e.target.value)}
                      placeholder="#7B2CBF"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
  );
}
