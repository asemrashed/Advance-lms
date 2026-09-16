'use client';

import { ReactNode } from 'react';

interface PageGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

const PageGrid = ({ 
  children, 
  className = '', 
  columns = 1,
  gap = 'md'
}: PageGridProps) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    7: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7'
  };

  const gridGaps = {
    sm: 'gap-2',
    md: 'gap-2 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
    xl: 'gap-6 sm:gap-8'
  };

  return (
    <div className={`grid ${gridCols[columns]} ${gridGaps[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default PageGrid;
