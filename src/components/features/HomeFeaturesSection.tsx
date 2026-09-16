import Image from "next/image";
import type { FeaturesContent } from "@/lib/websiteContentTypes";
import { FEATURE_ICON_BY_TYPE } from "@/lib/featureIconMeta";
import { htmlToPlainText } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in";

type HomeFeaturesSectionProps = {
  content: FeaturesContent;
};

export function HomeFeaturesSection({ content }: HomeFeaturesSectionProps) {
  const heading =
    content.sectionHeading?.trim() || "Powerful Features for an Elite Experience";
  const subtitle =
    content.sectionSubtitle?.trim() ||
    "Our platform isn't just about video lessons; it's a complete ecosystem designed to facilitate mastery and networking.";

  return (
    <section className="overflow-hidden bg-surface-container-low px-8 py-24">
      <div className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-20 lg:grid-cols-2">
        <FadeIn direction="right" className="relative order-2 lg:order-1">
          <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-blue-100 opacity-50 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border-8 border-white shadow-2xl">
            <Image
              src={content.image}
              alt="Platform features"
              width={640}
              height={640}
              className="aspect-square w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </FadeIn>

        <div className="order-1 lg:order-2">
          <FadeIn direction="left">
            <h2 className="mb-8 font-[family-name:var(--font-headline)] text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {heading}
            </h2>
            <p className="mb-12 text-lg leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </FadeIn>
          <StaggerContainer className="space-y-8">
            {content.features.map((feature) => {
              const meta = FEATURE_ICON_BY_TYPE[feature.iconType];
              return (
                <StaggerItem key={feature.id} direction="left">
                  <div className="flex gap-6">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
                    >
                      <span className="material-symbols-outlined text-3xl text-white">
                        {meta.icon}
                      </span>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xl font-bold text-foreground">
                        {feature.title}
                      </h4>
                      <p className="text-muted-foreground">
                        {htmlToPlainText(feature.description)}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
