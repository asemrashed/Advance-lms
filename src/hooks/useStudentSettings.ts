import { useState, useEffect, useCallback } from "react";
import {
  pickStudentSettingsForStorage,
  STUDENT_SETTINGS_ALLOWED_KEYS,
} from "@/lib/settingsScope";

interface StudentSettings {
  displayName: string;
  email: string;
  profileVisibility: boolean;
  bio: string;
  interests: string;
  learningGoals: string;
  allowInstructorMessages: boolean;
  showProgress: boolean;
  preferredEmail: string;
  emailSignature: string;
  courseNotifications: boolean;
  assignmentNotifications: boolean;
  emailNotifications: boolean;
  reminderNotifications: boolean;
}

interface Settings {
  student: StudentSettings;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

const defaultStudentSettings: StudentSettings = {
  displayName: "",
  email: "",
  profileVisibility: true,
  bio: "",
  interests: "",
  learningGoals: "",
  allowInstructorMessages: true,
  showProgress: true,
  preferredEmail: "",
  emailSignature: "",
  courseNotifications: true,
  assignmentNotifications: true,
  emailNotifications: true,
  reminderNotifications: true,
};

function pickStudentPayloadForApi(student: StudentSettings): Record<string, unknown> {
  const raw: Record<string, unknown> = { ...student };
  return pickStudentSettingsForStorage(raw);
}

export default function useStudentSettings() {
  const [settings, setSettings] = useState<Settings>({
    student: defaultStudentSettings,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/student/settings");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load settings: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.student) {
        setSettings({
          student: { ...defaultStudentSettings, ...data.student },
        });
      } else {
        setSettings({ student: defaultStudentSettings });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setSettings({ student: defaultStudentSettings });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = async (category: string, key: string, value: unknown) => {
    if (category !== "student" || !STUDENT_SETTINGS_ALLOWED_KEYS.has(key)) {
      return;
    }
    try {
      const response = await fetch("/api/student/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            [key]: value,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setting");
      }

      const data = await response.json();
      const nextStudent = data.student
        ? { ...defaultStudentSettings, ...data.student }
        : undefined;
      setSettings((prev) => ({
        ...prev,
        [category]: {
          ...prev[category as keyof Settings],
          ...(nextStudent ?? { ...prev.student, [key]: value }),
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    }
  };

  const saveAllSettings = async (allSettings: Settings) => {
    try {
      setSaveStatus("saving");
      setError(null);

      const payload = pickStudentPayloadForApi(allSettings.student);

      const response = await fetch("/api/student/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const mergedStudent = data.student
        ? { ...defaultStudentSettings, ...data.student }
        : { ...allSettings.student, ...payload };
      setSettings({ student: mergedStudent });
      setSaveStatus("success");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      setSaveStatus("error");
    }
  };

  const resetSettings = async (category?: string) => {
    try {
      if (category) {
        setSettings((prev) => ({
          ...prev,
          [category]: defaultStudentSettings,
        }));
      } else {
        setSettings({ student: defaultStudentSettings });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset settings");
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    saveStatus,
    updateSettings,
    saveAllSettings,
    resetSettings,
    refetch: fetchSettings,
  };
}
