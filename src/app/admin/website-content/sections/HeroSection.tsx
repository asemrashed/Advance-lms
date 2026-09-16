'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { CmsImageField } from './CmsImageField';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from '@/components/ui/collapsible';
import { LuPlus as Plus, LuSparkles as Sparkles, LuTrash2 as Trash } from 'react-icons/lu';
import type { WebsiteContent } from './types';

interface HeroSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

function ParagraphListEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const list = items.length > 0 ? items : [''];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold">{label}</label>
        {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
      </div>
      {list.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <AttractiveTextarea
            value={item}
            onChange={(e) => {
              const next = [...list];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder={`Paragraph ${index + 1}`}
            rows={4}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onChange(list.filter((_, i) => i !== index))}
            disabled={list.length <= 1}
            title="Remove paragraph"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...list, ''])}
      >
        <Plus className="w-4 h-4 mr-1" />
        Add paragraph
      </Button>
    </div>
  );
}

export function HeroSection({ content, updateContent }: HeroSectionProps) {
  const hero = content.hero;
  const introParagraphs = hero?.introParagraphs?.length
    ? hero.introParagraphs
    : [''];
  const bioLeft = hero?.bioColumns?.left?.length ? hero.bioColumns.left : [''];
  const bioRight = hero?.bioColumns?.right?.length ? hero.bioColumns.right : [''];

  const syncTagline = (value: string) => {
    updateContent(['hero', 'tagline'], value);
    updateContent(['hero', 'subtitle'], value);
  };

  const syncHeadline = (part: 'part1' | 'part2', value: string) => {
    updateContent(['hero', 'title', part], value);
  };

  const syncIntroParagraphs = (paragraphs: string[]) => {
    const cleaned = paragraphs.map((p) => p.trim()).filter(Boolean);
    updateContent(['hero', 'introParagraphs'], cleaned);
    updateContent(['hero', 'description'], cleaned.join('\n\n'));
  };

  const syncBioColumn = (side: 'left' | 'right', paragraphs: string[]) => {
    const cleaned = paragraphs.map((p) => p.trim()).filter(Boolean);
    updateContent(['hero', 'bioColumns', side], cleaned);
  };

  const syncHighlightStat = (value: string, label: string) => {
    updateContent(['hero', 'highlightStat'], { value, label });
    updateContent(['hero', 'stats', 'students', 'count'], value);
    updateContent(['hero', 'stats', 'students', 'enabled'], true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Home Hero (Editorial)
        </CardTitle>
        <CardDescription>
          AdvanceLMS-style home hero — tagline, brand, intro copy, portrait, stat badge, and bottom story columns.
          Use *asterisks* for italics (e.g. *living*).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <p className="text-xs text-gray-500 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          Maps to the public home page hero. Portrait default:{' '}
          <code className="text-[11px]">/images/nasmatic.png</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Tagline</label>
            <AttractiveInput
              value={hero?.tagline || hero?.subtitle || ''}
              onChange={(e) => syncTagline(e.target.value)}
              placeholder="Premier Digital Learning"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Brand name</label>
            <AttractiveInput
              value={hero?.brandDisplayName || ''}
              onChange={(e) => updateContent(['hero', 'brandDisplayName'], e.target.value)}
              placeholder="AdvanceLMS"
            />
            <p className="text-xs text-gray-500 mt-1">Shown in uppercase on the home page.</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold mb-2 block">Subject badge</label>
          <AttractiveInput
            value={hero?.badge || ''}
            onChange={(e) => updateContent(['hero', 'badge'], e.target.value)}
            placeholder="Cambridge IGCSE Add Maths · 0606"
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <label className="text-sm font-semibold block">Headline</label>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Before accent</label>
            <AttractiveInput
              value={hero?.title?.part1 || ''}
              onChange={(e) => syncHeadline('part1', e.target.value)}
              placeholder="Helping students see Mathematics in "
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Accent (italic, primary color)</label>
            <AttractiveInput
              value={hero?.title?.part2 || ''}
              onChange={(e) => syncHeadline('part2', e.target.value)}
              placeholder="the real world."
            />
          </div>
        </div>

        <ParagraphListEditor
          label="Intro paragraphs (left column)"
          hint="Two short paragraphs under the headline."
          items={introParagraphs}
          onChange={syncIntroParagraphs}
        />

        <Separator />

        <CmsImageField
          label="Portrait image"
          value={hero?.portraitImage || ''}
          onChange={(url) => updateContent(['hero', 'portraitImage'], url)}
          previewAlt="Hero portrait"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Stat value</label>
            <AttractiveInput
              value={hero?.highlightStat?.value || hero?.stats?.students?.count || ''}
              onChange={(e) =>
                syncHighlightStat(
                  e.target.value,
                  hero?.highlightStat?.label || 'A & A* RATE',
                )
              }
              placeholder="90%"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Stat label</label>
            <AttractiveInput
              value={hero?.highlightStat?.label || ''}
              onChange={(e) =>
                syncHighlightStat(
                  hero?.highlightStat?.value || hero?.stats?.students?.count || '90%',
                  e.target.value,
                )
              }
              placeholder="A & A* RATE"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Bottom story band</h3>
            <p className="text-xs text-gray-500 mt-1">
              Beige two-column section below the hero grid.
            </p>
          </div>
          <ParagraphListEditor
            label="Left column"
            items={bioLeft}
            onChange={(items) => syncBioColumn('left', items)}
          />
          <ParagraphListEditor
            label="Right column"
            items={bioRight}
            onChange={(items) => syncBioColumn('right', items)}
          />
        </div>

        <Collapsible defaultOpen={false}>
          <CollapsibleHeader className="text-sm font-semibold text-gray-700 cursor-pointer py-2">
            Legacy fields (buttons)
          </CollapsibleHeader>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Primary button</label>
                <AttractiveInput
                  value={hero?.buttons?.primary?.text || ''}
                  onChange={(e) => updateContent(['hero', 'buttons', 'primary', 'text'], e.target.value)}
                  className="mb-2"
                />
                <AttractiveInput
                  value={hero?.buttons?.primary?.href || ''}
                  onChange={(e) => updateContent(['hero', 'buttons', 'primary', 'href'], e.target.value)}
                  placeholder="/register"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Secondary button</label>
                <AttractiveInput
                  value={hero?.buttons?.secondary?.text || ''}
                  onChange={(e) => updateContent(['hero', 'buttons', 'secondary', 'text'], e.target.value)}
                  className="mb-2"
                />
                <AttractiveInput
                  value={hero?.buttons?.secondary?.href || ''}
                  onChange={(e) => updateContent(['hero', 'buttons', 'secondary', 'href'], e.target.value)}
                  placeholder="/register"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
