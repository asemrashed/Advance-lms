"use client";

import { useEffect, useState } from "react";
import {
  isLiveEnrollmentEnabled,
  isRecordedCoursesEnabled,
} from "@/lib/studentPortalSettings";
import { websiteContentService } from "@/services/websiteContentService";

/** False until CMS confirms Featured Courses is enabled (avoids flashing browse UI). */
export function useRecordedCoursesEnabled() {
  const [recordedCoursesEnabled, setRecordedCoursesEnabled] = useState(false);
  const [liveEnrollmentEnabled, setLiveEnrollmentEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void websiteContentService
      .getWebsiteContent()
      .then((data) => {
        if (cancelled) return;
        setRecordedCoursesEnabled(isRecordedCoursesEnabled(data));
        setLiveEnrollmentEnabled(isLiveEnrollmentEnabled(data));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setRecordedCoursesEnabled(false);
          setLiveEnrollmentEnabled(false);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { recordedCoursesEnabled, liveEnrollmentEnabled, ready };
}
