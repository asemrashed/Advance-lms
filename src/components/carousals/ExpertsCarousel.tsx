"use client";

import { useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";
import ExpertCard from "./ExpertCard";

type Expert = {
  id?: string;
  name: string;
  role: string;
  image: string;
  experience?: string;
};

type Props = {
  experts: Expert[];
  badgeLabel?: string;
  sectionHeading?: string;
  sectionSubtitle?: string;
};

export default function ExpertsCarousel({
  experts,
  badgeLabel = "Our Mentors",
  sectionHeading = "Meet Our Expert Mentors",
  sectionSubtitle = "Learn from the best in the industry—our mentors bring years of experience, knowledge, and passion to guide you.",
}: Props) {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="px-8 py-24">
      <div className="mx-auto max-w-screen-2xl">
        
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block rounded-md bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-800">
              {badgeLabel}
            </span>

            <h2 className="mb-3 font-[family-name:var(--font-headline)] text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
              {sectionHeading}
            </h2>

            <p className="text-base text-muted-foreground lg:text-lg">
              {sectionSubtitle}
            </p>
          </div>

          {/* Arrows (desktop) */}
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="h-10 w-10 rounded-full border border-border hover:bg-primary hover:text-white"
            >
              ←
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="h-10 w-10 rounded-full border border-border hover:bg-primary hover:text-white"
            >
              →
            </button>
          </div>
        </div>

        {/* Carousel */}
        <Swiper
          modules={[Navigation]}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          slidesPerView={1}
          spaceBetween={16}
          breakpoints={{
            640: { slidesPerView: 2 },
            900: { slidesPerView: 3 },
            1200: { slidesPerView: 4 },
          }}
        >
          {experts.map((ex) => (
            <SwiperSlide key={ex.id ?? `${ex.name}-${ex.role}`}>
              <ExpertCard expert={ex} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Mobile arrows */}
        <div className="mt-6 flex justify-center gap-3 sm:hidden">
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="h-10 w-10 rounded-full border border-border"
          >
            ←
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="h-10 w-10 rounded-full border border-border"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}