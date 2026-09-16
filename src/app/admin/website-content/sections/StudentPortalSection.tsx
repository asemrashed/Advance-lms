'use client';

import type { WebsiteContent } from './types';
import { isRecordedCoursesEnabled } from '@/lib/studentPortalSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LuSettings as Settings } from 'react-icons/lu';

interface StudentPortalSectionProps {
  content: WebsiteContent;
  setRecordedCoursesPublicVisibility: (enabled: boolean) => void;
}

export function StudentPortalSection({
  content,
  setRecordedCoursesPublicVisibility,
}: StudentPortalSectionProps) {
  const recordedCoursesEnabled = isRecordedCoursesEnabled(content);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Student Portal Settings
        </CardTitle>
        <CardDescription>
          Same as Home Page → Section Order → Featured Courses. Controls the public
          recorded-course catalog (/courses, home section, browse links). Students and
          instructors can still open courses they enrolled in or created from their
          dashboards when this is off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
          <div>
            <label className="text-sm font-semibold">Show recorded courses</label>
            <p className="text-sm text-gray-500">
              When off, the public catalog is hidden. Enrolled students keep access
              under My Courses, and instructors keep access to their own courses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRecordedCoursesPublicVisibility(!recordedCoursesEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              recordedCoursesEnabled ? 'bg-[#7B2CBF]' : 'bg-gray-300'
            }`}
            aria-pressed={recordedCoursesEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                recordedCoursesEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
