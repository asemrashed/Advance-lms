'use client';

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LuX as X } from 'react-icons/lu';
import { cn, htmlToPlainText } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCancelButton?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-[min(100%,400px)] max-w-[400px]',
  md: 'w-[min(100%,500px)] max-w-[500px]',
  lg: 'w-[min(100%,85vw)] max-w-[85vw]',
  xl: 'w-[min(100%,90vw)] max-w-[90vw]',
  '2xl': 'w-[min(100%,92vw)] max-w-[92vw]',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCancelButton = true,
  cancelText = 'Cancel',
  onCancel,
  className = '',
}: ModalProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'flex max-h-[min(85dvh,920px)] flex-col overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-2xl',
          sizeClasses[size],
          className,
        )}
      >
        <DialogHeader className="bg-primary text-primary-foreground p-6 -m-6 mb-0 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <div className="w-6 h-6 bg-white/30 rounded"></div>
                </div>
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-base" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {htmlToPlainText(description)}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono">ESC</kbd>
              <span>to close</span>
            </div>
          </div>
        </DialogHeader>

        <div className="qb-thin-scroll min-h-0 flex-1 overflow-y-auto px-2 py-4">
          {children}
        </div>

        {(footer || showCancelButton) && (
          <DialogFooter className="flex-shrink-0 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 mt-0 px-6 py-4">
            {footer ? (
              footer
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-12 border-primary bg-transparent text-primary transition-all duration-200 font-medium group hover:bg-primary/10 hover:text-primary"
                >
                  <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                  {cancelText}
                </Button>
              </div>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
