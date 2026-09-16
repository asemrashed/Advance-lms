'use client';

import { ReactNode } from 'react';
import { htmlToPlainText } from '@/lib/utils';

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

const PageSection = ({ 
  children, 
  className = '', 
  title, 
  description, 
  actions 
}: PageSectionProps) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/50 shadow-sm ${className}`}>
      {(title || description || actions) && (
        <div className="p-4 sm:p-6 border-b border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm" style={{ color: '#7B2CBF' }}>
                  {htmlToPlainText(description)}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default PageSection;
