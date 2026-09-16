"use client";

import Image from "next/image";

type Expert = {
  name: string;
  role: string;
  image: string;
  experience?: string;
  students?: number;
  courses?: number;
};

export default function ExpertCard({ expert }: { expert: Expert }) {
  return (
    <div className="group my-2 rounded-3xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md">
      
      {/* Image */}
      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
        <Image
          src={expert.image}
          alt={expert.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Info */}
      <div>
        {/* Name + badge */}
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold text-gray-900">
            {expert.name}
          </h4>

          {/* Verified badge */}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">
            ✓
          </span>
        </div>

        {/* Role / description */}
        <p className="mt-1 text-sm text-gray-500">
          {expert.role}
        </p>
        {expert.experience?.trim() ? (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
            {expert.experience.trim()}
          </p>
        ) : null}
      </div>

      {/* Bottom section */}
      {/* <div className="mt-4 flex items-center justify-between"> */}
        
        {/* Stats */}
        {/* <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            👤 {expert.students ?? 0}
          </span>
          <span className="flex items-center gap-1">
            📚 {expert.courses ?? 0}
          </span>
        </div> */}

        {/* Follow button */}
        {/* <button className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
          Follow +
        </button>
      </div> */}
    </div>
  );
}