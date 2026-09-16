import type { WhyChooseUsFeature } from "@/lib/websiteContentTypes";

export const FEATURE_ICON_BY_TYPE: Record<
  WhyChooseUsFeature["iconType"],
  { icon: string; iconBg: string }
> = {
  flexible: { icon: "route", iconBg: "bg-primary" },
  instructor: { icon: "video_chat", iconBg: "bg-secondary" },
  community: { icon: "groups", iconBg: "bg-tertiary-container" },
  money: { icon: "dashboard", iconBg: "bg-[#0040a1]" },
};
