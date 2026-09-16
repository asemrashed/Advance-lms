import type { FeaturesContent } from "@/lib/websiteContentTypes";
import { FEATURE_ICON_BY_TYPE } from "@/lib/featureIconMeta";
import { htmlToPlainText } from "@/lib/utils";

type AboutFeaturesCardsProps = {
  content: FeaturesContent;
};

export function AboutFeaturesCards({ content }: AboutFeaturesCardsProps) {
  const heading =
    content.sectionHeading?.trim() || "Powerful Features for an Elite Experience";
  const subtitle =
    content.sectionSubtitle?.trim() ||
    "Our platform isn't just about video lessons; it's a complete ecosystem designed to facilitate mastery and networking.";

  return (
    <section className="bg-surface px-6 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Why choose us
          </p>
          <h2 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {heading}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {content.features.map((feature, index) => {
            const meta = FEATURE_ICON_BY_TYPE[feature.iconType];
            return (
              <article
                key={feature.id}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${meta.iconBg} shadow-sm transition-transform duration-300 group-hover:scale-105`}
                >
                  <span className="material-symbols-outlined text-3xl text-white">
                    {meta.icon}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {htmlToPlainText(feature.description)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
