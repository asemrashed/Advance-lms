'use client';

import { ReactNode } from 'react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { LuTriangleAlert as AlertTriangle, LuCheck as CheckCircle, LuInfo as LuInfo, LuX as XCircle } from 'react-icons/lu';;
import { htmlToPlainText } from '@/lib/utils';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  loading?: boolean;
  children?: ReactNode;
}

const variantConfig = {
  danger: {
    icon: XCircle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
    titleColor: 'text-red-900',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    titleColor: 'text-yellow-900',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
    titleColor: 'text-green-900',
  },
  info: {
    icon: LuInfo,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    buttonClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
    titleColor: 'text-primary',
  },
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}: ConfirmModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const footer = (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={loading}
        className="flex-1 h-12 border-primary bg-transparent text-primary transition-all duration-200 font-medium hover:bg-primary/10 hover:text-primary"
      >
        {cancelText}
      </Button>
      <Button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`flex-1 h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${config.buttonClass}`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          confirmText
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      size="sm"
      className="text-center"
    >
      <div className="flex flex-col items-center space-y-4 py-4">
        <div className={`p-4 rounded-full ${config.iconBg}`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        <div className="space-y-2">
          <h3 className={`text-lg font-semibold ${config.titleColor}`}>
            {title}
          </h3>
          {description && (
            <p className="text-gray-600 text-sm">
              {htmlToPlainText(description)}
            </p>
          )}
        </div>
        {children && (
          <div className="w-full">
            {children}
          </div>
        )}
      </div>
    </Modal>
  );
}
