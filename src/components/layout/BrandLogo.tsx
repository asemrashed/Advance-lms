import { cn } from '@/lib/cn';
import { SITE_BRAND_NAME, SITE_LOGO_PUBLIC_PATH } from '@/lib/siteBrandingConstants';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
};

/** Site branding: single image logo from public/logo.png */
export function BrandLogo({
  alt = SITE_BRAND_NAME,
  className,
  imageClassName,
}: BrandLogoProps) {
  return (
    <img
      src={SITE_LOGO_PUBLIC_PATH}
      alt={alt}
      className={cn(
        'h-10 w-auto max-w-[11rem] shrink-0 object-contain sm:h-12',
        className,
        imageClassName,
      )}
    />
  );
}
