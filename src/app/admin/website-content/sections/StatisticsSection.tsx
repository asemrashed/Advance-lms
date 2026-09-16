'use client';

import type { WebsiteContent } from './types';
import { defaultStatisticsContent } from '@/lib/websiteContentDefaults';
import type { StatisticsItem } from '@/lib/websiteContentTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Button } from '@/components/ui/button';
import { LuChartBar as BarChart, LuPlus as Plus, LuTrash2 as Trash } from 'react-icons/lu';

const ICON_OPTIONS: Array<{
  value: StatisticsItem['iconType'];
  label: string;
}> = [
  { value: 'students', label: 'Students' },
  { value: 'courses', label: 'Courses' },
  { value: 'tutors', label: 'Tutors' },
  { value: 'awards', label: 'Awards' },
];

interface StatisticsSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
}

export function StatisticsSection({ content, updateContent }: StatisticsSectionProps) {
  const section = {
    ...defaultStatisticsContent,
    ...(content.statistics ?? {}),
  };
  const items =
    section.items?.length > 0 ? section.items : defaultStatisticsContent.items;

  const setItems = (next: StatisticsItem[]) => {
    updateContent(['statistics', 'items'], next);
  };

  const addItem = () => {
    const maxId = items.reduce((m, item) => Math.max(m, item.id), 0);
    setItems([
      ...items,
      {
        id: maxId + 1,
        number: '0',
        suffix: '+',
        label: 'New stat',
        labelBengali: '',
        iconType: 'students',
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<StatisticsItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Statistics
          </CardTitle>
          <CardDescription>
            Shown on the home page between the hero and featured courses. Up to four stat cards
            are recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <Card key={item.id} className="border-dashed">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Stat {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Number</label>
                    <AttractiveInput
                      value={item.number}
                      onChange={(e) => updateItem(index, { number: e.target.value })}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Suffix</label>
                    <AttractiveInput
                      value={item.suffix}
                      onChange={(e) => updateItem(index, { suffix: e.target.value })}
                      placeholder="k"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Label</label>
                    <AttractiveInput
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                      placeholder="Students Enrolled"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">Icon</label>
                    <select
                      value={item.iconType}
                      onChange={(e) =>
                        updateItem(index, {
                          iconType: e.target.value as StatisticsItem['iconType'],
                        })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add stat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
