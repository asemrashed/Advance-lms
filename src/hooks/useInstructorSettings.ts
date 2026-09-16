import { useState, useEffect, useCallback } from "react";
import {
  INSTRUCTOR_SETTINGS_ALLOWED_KEYS,
  pickInstructorSettingsForStorage,
} from "@/lib/settingsScope";

interface InstructorSettings {
  displayName: string;
  email: string;
  profileVisibility: boolean;
  bio: string;
  expertise: string;
  teachingExperience: number;
  allowStudentMessages: boolean;
  showContactInfo: boolean;
  preferredEmail: string;
  emailSignature: string;
  courseNotifications: boolean;
  studentNotifications: boolean;
  emailNotifications: boolean;
  payoutMethod: string;
  payoutAccountMasked: string;
  payoutFrequency: string;
  payoutThreshold: number;
  nextPayoutDate: string;
}

interface AllSettings {
  instructor?: InstructorSettings;
}

interface UseInstructorSettingsReturn {
  settings: AllSettings;
  isLoading: boolean;
  error: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  updateSettings: (category: string, newSettings: Record<string, unknown>) => Promise<void>;
  saveAllSettings: (allSettings: AllSettings) => Promise<void>;
  resetSettings: (category?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const defaultInstructorSettings: InstructorSettings = {
  displayName: "",
  email: "",
  profileVisibility: true,
  bio: "",
  expertise: "",
  teachingExperience: 0,
  allowStudentMessages: true,
  showContactInfo: true,
  preferredEmail: "",
  emailSignature: "",
  courseNotifications: true,
  studentNotifications: true,
  emailNotifications: true,
  payoutMethod: "",
  payoutAccountMasked: "",
  payoutFrequency: "monthly",
  payoutThreshold: 0,
  nextPayoutDate: "",
};

function pickInstructorForApi(inst: InstructorSettings | undefined): Record<string, unknown> {
  if (!inst) return {};
  return pickInstructorSettingsForStorage({ ...inst } as Record<string, unknown>);
}

export default function useInstructorSettings(): UseInstructorSettingsReturn {
  const [settings, setSettings] = useState<AllSettings>({
    instructor: defaultInstructorSettings,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/instructor/settings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load settings: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        const settingsData = data.data as AllSettings | undefined;
        if (!settingsData || Object.keys(settingsData).length === 0) {
          setSettings({
            instructor: defaultInstructorSettings,
          });
        } else {
          const inst = settingsData.instructor;
          setSettings({
            instructor: {
              ...defaultInstructorSettings,
              ...(inst ?? {}),
            },
          });
        }
      } else {
        throw new Error(data.error || "Failed to load settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setSettings({
        instructor: defaultInstructorSettings,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (category: string, newSettings: Record<string, unknown>) => {
    if (category !== "instructor") return;

    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(newSettings)) {
      if (INSTRUCTOR_SETTINGS_ALLOWED_KEYS.has(key)) {
        filtered[key] = newSettings[key];
      }
    }
    if (Object.keys(filtered).length === 0) return;

    setSaveStatus("saving");
    setError(null);

    try {
      const response = await fetch("/api/instructor/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          settings: filtered,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      const data = await response.json();

      if (data.success) {
        const inst = data.data?.instructor as InstructorSettings | undefined;
        setSettings((prev) => ({
          ...prev,
          instructor: {
            ...defaultInstructorSettings,
            ...prev.instructor,
            ...(inst ?? filtered),
          },
        }));
        setSaveStatus("saved");
      } else {
        throw new Error(data.error || "Failed to update settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
      setSaveStatus("error");
    }
  }, []);

  const saveAllSettings = useCallback(async (allSettings: AllSettings) => {
    setSaveStatus("saving");
    setError(null);

    try {
      const filtered = pickInstructorForApi(allSettings.instructor);

      const response = await fetch("/api/instructor/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: { instructor: filtered },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        const inst = data.data?.instructor as Partial<InstructorSettings> | undefined;
        setSettings({
          instructor: {
            ...defaultInstructorSettings,
            ...allSettings.instructor,
            ...inst,
          },
        });
        setSaveStatus("saved");
      } else {
        throw new Error(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      setSaveStatus("error");
    }
  }, []);

  const resetSettings = useCallback(
    async (category?: string) => {
      setSaveStatus("saving");
      setError(null);

      try {
        const url = category
          ? `/api/instructor/settings?category=${encodeURIComponent(category)}`
          : "/api/instructor/settings";

        const response = await fetch(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to reset settings");
        }

        const data = await response.json();

        if (data.success) {
          await loadSettings();
          setSaveStatus("saved");
        } else {
          throw new Error(data.error || "Failed to reset settings");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reset settings");
        setSaveStatus("error");
      }
    },
    [loadSettings],
  );

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    saveStatus,
    updateSettings,
    saveAllSettings,
    resetSettings,
    refetch: loadSettings,
  };
}
