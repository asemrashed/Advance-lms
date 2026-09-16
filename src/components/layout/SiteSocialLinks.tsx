import Link from 'next/link';
import {
  LuFacebook,
  LuInstagram,
  LuLinkedin,
  LuTwitter,
  LuYoutube,
} from 'react-icons/lu';
import { cn } from '@/lib/cn';

export type SocialLinks = {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
};

const SOCIAL_CONFIG = [
  { key: 'facebook' as const, Icon: LuFacebook, label: 'Facebook' },
  { key: 'twitter' as const, Icon: LuTwitter, label: 'Twitter / X' },
  { key: 'linkedin' as const, Icon: LuLinkedin, label: 'LinkedIn' },
  { key: 'instagram' as const, Icon: LuInstagram, label: 'Instagram' },
  { key: 'youtube' as const, Icon: LuYoutube, label: 'YouTube' },
] as const;

type SiteSocialLinksProps = {
  links: SocialLinks;
  className?: string;
  iconClassName?: string;
};

export function SiteSocialLinks({ links, className, iconClassName }: SiteSocialLinksProps) {
  const items = SOCIAL_CONFIG.filter(({ key }) => {
    const href = links[key]?.trim();
    return href && href !== '#';
  });

  if (items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {items.map(({ key, Icon, label }) => {
        const href = links[key]!.trim();
        return (
          <Link
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary',
              iconClassName,
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </div>
  );
}
