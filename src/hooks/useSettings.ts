import { useState, useEffect, useCallback } from 'react';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
}

interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
}

interface NotificationSettings {
  emailNotifications: boolean;
  systemNotifications: boolean;
  courseUpdates: boolean;
  paymentNotifications: boolean;
  enrollmentNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

interface DatabaseSettings {
  backupFrequency: string;
  backupRetention: number;
  autoCleanup: boolean;
  logRetention: number;
  lastBackupAt?: string;
  lastBackupKey?: string;
  lastBackupFormat?: string;
  lastBackupSize?: number;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  useSSL: boolean;
  fromEmail: string;
  fromName: string;
}

interface PaymentSettings {
  provider: 'sslcommerz';
  environment: 'sandbox' | 'live';
  storeId: string;
  storePassword: string;
  sandboxUrl: string;
  liveUrl: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

interface AllSettings {
  system?: SystemSettings;
  security?: SecuritySettings;
  notifications?: NotificationSettings;
  database?: DatabaseSettings;
  email?: EmailSettings;
  payment?: PaymentSettings;
}

interface UseSettingsReturn {
  settings: AllSettings;
  isLoading: boolean;
  error: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  loadSettings: () => Promise<void>;
  updateSettings: (category: string, newSettings: any) => Promise<void>;
  saveAllSettings: (allSettings: AllSettings) => Promise<void>;
  saveCategorySettings: (category: keyof AllSettings, partial: Record<string, any>) => Promise<void>;
  resetSettings: (category?: string) => Promise<void>;
}

const defaultSystemSettings: SystemSettings = {
  siteName: 'PetMota LMS',
  siteDescription: 'Comprehensive Learning Management System',
  siteUrl: 'https://petmota-lms.com',
  adminEmail: 'admin@petmota-lms.com',
  supportEmail: 'support@petmota-lms.com',
  timezone: 'UTC',
  language: 'en',
  maintenanceMode: false,
  registrationEnabled: true,
  emailVerificationRequired: true,
};

const defaultSecuritySettings: SecuritySettings = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false,
  sessionTimeout: 24,
  maxLoginAttempts: 5,
  twoFactorEnabled: false,
  ipWhitelist: [],
};

const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  systemNotifications: true,
  courseUpdates: true,
  paymentNotifications: true,
  enrollmentNotifications: true,
  weeklyReports: true,
  monthlyReports: false,
};

const defaultDatabaseSettings: DatabaseSettings = {
  backupFrequency: 'daily',
  backupRetention: 30,
  autoCleanup: true,
  logRetention: 90,
};

const defaultEmailSettings: EmailSettings = {
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  useSSL: true,
  fromEmail: '',
  fromName: '',
};

const defaultPaymentSettings: PaymentSettings = {
  provider: 'sslcommerz',
  environment: 'sandbox',
  storeId: '',
  storePassword: '',
  sandboxUrl: 'https://sandbox.sslcommerz.com',
  liveUrl: 'https://securepay.sslcommerz.com',
  successUrl: 'http://localhost:3000/payment/success',
  failUrl: 'http://localhost:3000/payment/fail',
  cancelUrl: 'http://localhost:3000/payment/cancel',
  ipnUrl: 'http://localhost:3000/api/payment/ipn',
};

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AllSettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Merge with defaults to ensure all fields are present
        const mergedSettings: AllSettings = {
          system: { ...defaultSystemSettings, ...data.data.system },
          security: { ...defaultSecuritySettings, ...data.data.security },
          notifications: { ...defaultNotificationSettings, ...data.data.notifications },
          database: { ...defaultDatabaseSettings, ...data.data.database },
          email: { ...defaultEmailSettings, ...data.data.email },
          payment: { ...defaultPaymentSettings, ...data.data.payment },
        };
        
        setSettings(mergedSettings);
      } else {
        throw new Error(data.error || 'Failed to load settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (category: string, newSettings: any) => {
    setSaveStatus('saving');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          settings: newSettings,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [category]: newSettings,
        }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.error('Error updating settings:', err);
    }
  }, []);

  const saveAllSettings = useCallback(async (allSettings: AllSettings) => {
    setSaveStatus('saving');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: allSettings,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(allSettings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.error('Error saving settings:', err);
    }
  }, []);

  const saveCategorySettings = useCallback(async (category: keyof AllSettings, partial: Record<string, any>) => {
    setSaveStatus('saving');
    setError(null);

    try {
      // Merge current category settings with provided partial to ensure completeness for server-side validation
      const currentCategorySettings = (settings[category] || {}) as Record<string, any>;
      const merged = { ...currentCategorySettings, ...partial };

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          settings: merged,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const data = await response.json();

      if (data.success) {
        setSettings(prev => ({
          ...prev,
          [category]: merged as any,
        }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.error('Error updating category settings:', err);
    }
  }, [settings]);

  const resetSettings = useCallback(async (category?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = category 
        ? `/api/admin/settings?category=${category}`
        : '/api/admin/settings';
        
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        if (category) {
          // Reset specific category to defaults
          const defaultSettings = {
            system: defaultSystemSettings,
            security: defaultSecuritySettings,
            notifications: defaultNotificationSettings,
            database: defaultDatabaseSettings,
            email: defaultEmailSettings,
          };
          
          setSettings(prev => ({
            ...prev,
            [category]: defaultSettings[category as keyof typeof defaultSettings],
          }));
        } else {
          // Reset all settings to defaults
          setSettings({
            system: defaultSystemSettings,
            security: defaultSecuritySettings,
            notifications: defaultNotificationSettings,
            database: defaultDatabaseSettings,
            email: defaultEmailSettings,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to reset settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      console.error('Error resetting settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    saveStatus,
    loadSettings,
    updateSettings,
    saveAllSettings,
    saveCategorySettings,
    resetSettings,
  };
}
