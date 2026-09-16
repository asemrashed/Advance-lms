'use client';

import PageSection from "./PageSection";
import { htmlToPlainText } from '@/lib/utils';

interface WelcomeSectionProps {
  title: string;
  description: string;
  className?: string;
}

const WelcomeSection = ({ 
  title, 
  description, 
  className = '' 
}: WelcomeSectionProps) => {
  return (
    <PageSection 
      className={`mb-2 sm:mb-4 bg-transparent border-0 shadow-none p-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <div className="h-6 w-1 rounded-full bg-primary sm:h-8" />
        <div className="flex-1">
          <h1 className="text-lg font-bold text-primary sm:text-xl md:text-2xl">
            {title}
          </h1>
          <p className="text-xs text-gray-600 sm:text-sm">{htmlToPlainText(description)}</p>
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <div className="h-2 w-2 animate-ping rounded-full bg-primary/70" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
        </div>
      </div>
    </PageSection>
  );
};

export default WelcomeSection;
