'use client';

import { ReactNode } from 'react';

interface ContentAreaProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  scrollable?: boolean;
}

const ContentArea = ({ 
  children, 
  className = '', 
  maxHeight = 'auto',
  scrollable = false
}: ContentAreaProps) => {
  return (
    <div 
      className={`
        ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} 
        ${className}
      `}
      style={{ maxHeight: maxHeight !== 'auto' ? maxHeight : undefined }}
    >
      {children}
    </div>
  );
};

export default ContentArea;
