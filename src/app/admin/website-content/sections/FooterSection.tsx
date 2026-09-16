'use client';

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
  defaultFooterContent,
} from '@/lib/websiteContentDefaults';
import type { WebsiteContent } from './types';


interface FooterSectionProps {
content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

export function FooterSection({ content, updateContent }: FooterSectionProps) {
  return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutIcon className="w-5 h-5" />
                Footer Section Settings
              </CardTitle>
              <CardDescription>Configure the footer content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Branding */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">Branding</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AttractiveInput
                    value={content.footer?.branding?.logoText || ''}
                    onChange={(e) => updateContent(['footer', 'branding', 'logoText'], e.target.value)}
                    placeholder="Logo Text"
                  />
                  <AttractiveInput
                    value={content.footer?.branding?.logoIcon || ''}
                    onChange={(e) => updateContent(['footer', 'branding', 'logoIcon'], e.target.value)}
                    placeholder="Logo Icon (single character)"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Icon Color</label>
                    <input
                      type="color"
                      value={content.footer?.branding?.logoIconColor || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'branding', 'logoIconColor'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.branding?.logoIconColor || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'branding', 'logoIconColor'], e.target.value)}
                      placeholder="#A855F7"
                      className="flex-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Text Color</label>
                    <input
                      type="color"
                      value={content.footer?.branding?.logoTextColor || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'branding', 'logoTextColor'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.branding?.logoTextColor || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'branding', 'logoTextColor'], e.target.value)}
                      placeholder="#A855F7"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
                <CustomEditor
                  value={content.footer?.branding?.description || ''}
                  onChange={(data) => updateContent(['footer', 'branding', 'description'], data)}
                  placeholder="Description"
                />
              </div>

              {/* Newsletter */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">Newsletter</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AttractiveInput
                    value={content.footer?.newsletter?.title || ''}
                    onChange={(e) => updateContent(['footer', 'newsletter', 'title'], e.target.value)}
                    placeholder="Newsletter Title"
                  />
                  <AttractiveInput
                    value={content.footer?.newsletter?.emailPlaceholder || ''}
                    onChange={(e) => updateContent(['footer', 'newsletter', 'emailPlaceholder'], e.target.value)}
                    placeholder="Email Placeholder"
                  />
                  <AttractiveInput
                    value={content.footer?.newsletter?.buttonText || ''}
                    onChange={(e) => updateContent(['footer', 'newsletter', 'buttonText'], e.target.value)}
                    placeholder="Button Text"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Button Gradient From</label>
                    <input
                      type="color"
                      value={content.footer?.newsletter?.buttonGradientFrom || '#EC4899'}
                      onChange={(e) => updateContent(['footer', 'newsletter', 'buttonGradientFrom'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.newsletter?.buttonGradientFrom || '#EC4899'}
                      onChange={(e) => updateContent(['footer', 'newsletter', 'buttonGradientFrom'], e.target.value)}
                      placeholder="#EC4899"
                      className="flex-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Button Gradient To</label>
                    <input
                      type="color"
                      value={content.footer?.newsletter?.buttonGradientTo || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'newsletter', 'buttonGradientTo'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.newsletter?.buttonGradientTo || '#A855F7'}
                      onChange={(e) => updateContent(['footer', 'newsletter', 'buttonGradientTo'], e.target.value)}
                      placeholder="#A855F7"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Company Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Company Links</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentLinks = content.footer?.companyLinks && content.footer.companyLinks.length > 0 
                        ? content.footer.companyLinks 
                        : defaultFooterContent.companyLinks;
                      const newLinks = [...currentLinks, { label: '', href: '#' }];
                      updateContent(['footer', 'companyLinks'], newLinks);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>
                {(content.footer?.companyLinks && content.footer.companyLinks.length > 0 
                  ? content.footer.companyLinks 
                  : defaultFooterContent.companyLinks).map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const updatedLinks = [...(content.footer?.companyLinks || defaultFooterContent.companyLinks)];
                        updatedLinks[index] = { ...updatedLinks[index], label: e.target.value };
                        updateContent(['footer', 'companyLinks'], updatedLinks);
                      }}
                      placeholder="Link Label"
                      className="flex-1"
                    />
                    <Input
                      type="url"
                      value={link.href}
                      onChange={(e) => {
                        const updatedLinks = [...(content.footer?.companyLinks || defaultFooterContent.companyLinks)];
                        updatedLinks[index] = { ...updatedLinks[index], href: e.target.value };
                        updateContent(['footer', 'companyLinks'], updatedLinks);
                      }}
                      placeholder="Link URL"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const updatedLinks = (content.footer?.companyLinks || defaultFooterContent.companyLinks).filter((_, i) => i !== index);
                        updateContent(['footer', 'companyLinks'], updatedLinks);
                      }}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Quick Links</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentLinks = content.footer?.quickLinks && content.footer.quickLinks.length > 0 
                        ? content.footer.quickLinks 
                        : defaultFooterContent.quickLinks;
                      const newLinks = [...currentLinks, { label: '', href: '#' }];
                      updateContent(['footer', 'quickLinks'], newLinks);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>
                {(content.footer?.quickLinks && content.footer.quickLinks.length > 0 
                  ? content.footer.quickLinks 
                  : defaultFooterContent.quickLinks).map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const updatedLinks = [...(content.footer?.quickLinks || defaultFooterContent.quickLinks)];
                        updatedLinks[index] = { ...updatedLinks[index], label: e.target.value };
                        updateContent(['footer', 'quickLinks'], updatedLinks);
                      }}
                      placeholder="Link Label"
                      className="flex-1"
                    />
                    <Input
                      type="url"
                      value={link.href}
                      onChange={(e) => {
                        const updatedLinks = [...(content.footer?.quickLinks || defaultFooterContent.quickLinks)];
                        updatedLinks[index] = { ...updatedLinks[index], href: e.target.value };
                        updateContent(['footer', 'quickLinks'], updatedLinks);
                      }}
                      placeholder="Link URL"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const updatedLinks = (content.footer?.quickLinks || defaultFooterContent.quickLinks).filter((_, i) => i !== index);
                        updateContent(['footer', 'quickLinks'], updatedLinks);
                      }}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">Contact Information</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Address Label</label>
                    <Input
                      type="text"
                      value={content.footer?.contact?.address?.label || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'address', 'label'], e.target.value)}
                      placeholder="Address Label"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Address Value</label>
                    <Input
                      type="text"
                      value={content.footer?.contact?.address?.value || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'address', 'value'], e.target.value)}
                      placeholder="Address Value"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Phone Label</label>
                    <Input
                      type="text"
                      value={content.footer?.contact?.phone?.label || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'phone', 'label'], e.target.value)}
                      placeholder="Phone Label"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Phone Value</label>
                    <Input
                      type="text"
                      value={content.footer?.contact?.phone?.value || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'phone', 'value'], e.target.value)}
                      placeholder="Phone Value"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Email Label</label>
                    <Input
                      type="text"
                      value={content.footer?.contact?.email?.label || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'email', 'label'], e.target.value)}
                      placeholder="Email Label"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Email Value</label>
                    <Input
                      type="email"
                      value={content.footer?.contact?.email?.value || ''}
                      onChange={(e) => updateContent(['footer', 'contact', 'email', 'value'], e.target.value)}
                      placeholder="Email Value"
                    />
                  </div>
                </div>
              </div>


              {/* Copyright */}
              <div>
                <label className="text-sm font-semibold mb-2 block">Copyright Text</label>
                <Input
                  type="text"
                  value={content.footer?.copyright || ''}
                  onChange={(e) => updateContent(['footer', 'copyright'], e.target.value)}
                  placeholder="Copyright Text"
                />
              </div>


              {/* Background Gradient */}
              <div className="space-y-4">
                <label className="text-sm font-semibold mb-2 block">Background Gradient</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">From</label>
                    <input
                      type="color"
                      value={content.footer?.backgroundGradient?.from || '#FFF5E6'}
                      onChange={(e) => updateContent(['footer', 'backgroundGradient', 'from'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.backgroundGradient?.from || '#FFF5E6'}
                      onChange={(e) => updateContent(['footer', 'backgroundGradient', 'from'], e.target.value)}
                      placeholder="#FFF5E6"
                      className="flex-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">To</label>
                    <input
                      type="color"
                      value={content.footer?.backgroundGradient?.to || '#E0F2FE'}
                      onChange={(e) => updateContent(['footer', 'backgroundGradient', 'to'], e.target.value)}
                      className="h-8 w-16 rounded border"
                    />
                    <Input
                      type="text"
                      value={content.footer?.backgroundGradient?.to || '#E0F2FE'}
                      onChange={(e) => updateContent(['footer', 'backgroundGradient', 'to'], e.target.value)}
                      placeholder="#E0F2FE"
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
  );
}
