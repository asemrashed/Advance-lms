"use client";

import { Chapter } from "@/types/chapter";
import { Lesson } from "@/types/lesson";
import { useState, useEffect } from "react";
import { FaRegPlayCircle } from "react-icons/fa";
import { MdLockOutline } from "react-icons/md";
import { IoChevronUp, IoChevronDown } from "react-icons/io5";
import { GrPlayFill } from "react-icons/gr";

type Props = {
  chapter: Chapter;
  lessons: Lesson[];
  courseId: string;
  isFirst?: boolean; // 👈 important
};

export default function CourseCurriculum({
  chapter,
  lessons = [],
  isFirst = false,
}: Props) {
  // ✅ open only if first chapter
  const [open, setOpen] = useState(isFirst);

  useEffect(() => {
    setOpen(isFirst);
  }, [isFirst]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  if (!chapter) {
    return null;
  }

  return (
    <div className="rounded-md border p-2 border-border bg-muted/30">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <FaRegPlayCircle className="text-primary" />

          <h3 className="font-bold text-foreground">
            {chapter.title}
          </h3>

          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            100%
          </span>
        </div>

        {open ? (
          <IoChevronUp className="text-muted-foreground" />
        ) : (
          <IoChevronDown className="text-muted-foreground" />
        )}
      </div>

      {/* Lessons */}
      {open && (
        <div className="mb-2">
          {lessons.length > 0 ? (
            lessons.map((lesson, index) => (
              <div
                key={lesson._id}
                className="bg-background p-3 rounded-md mb-1 md:mb-2 flex items-center justify-between mx-2 ml-4 py-2 md:py-3 pl-2 md:pl-4"
              >
                {/* Left */}
                <div className="flex items-center gap-3">
                  <FaRegPlayCircle className="text-primary" />

                  <span className="text-sm text-foreground">
                    {lesson.title}
                  </span>
                </div>

                {/* Right */}
                {index === 0 ? (
                  <button className="rounded-full border border-primary p-1.5 text-sm text-primary hover:bg-primary hover:text-white cursor-pointer">
                    <GrPlayFill className="size-2" />
                  </button>
                ) : (
                  <MdLockOutline className="text-muted-foreground" />
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-3 text-sm text-muted-foreground">
              No lessons available
            </div>
          )}
        </div>
      )}
    </div>
  );
}