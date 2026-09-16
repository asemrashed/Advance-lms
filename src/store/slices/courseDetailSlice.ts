import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { CourseFaq } from "@/types/courseFaq";
import type { Chapter } from "@/types/chapter";
import type { Lesson } from "@/types/lesson";
import type { PublicCourseDetailData } from "@/types/publicCourse";
import * as courseBundleService from "@/services/courseBundleService";

export type CourseDetailLoadStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

export interface CourseDetailState {
  courseId: string | null;
  course: PublicCourseDetailData | null;
  chapters: Chapter[];
  lessons: Lesson[];
  faqs: CourseFaq[];
  status: CourseDetailLoadStatus;
  error: string | null;
}

const initialState: CourseDetailState = {
  courseId: null,
  course: null,
  chapters: [],
  lessons: [],
  faqs: [],
  status: "idle",
  error: null,
};

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const fetchCourseBundle = createAsyncThunk(
  "courseDetail/fetchBundle",
  async (courseId: string, { rejectWithValue }) => {
    const trimmed = courseId.trim();
    if (!objectIdRegex.test(trimmed)) {
      return rejectWithValue("Invalid course ID format");
    }
    try {
      return await courseBundleService.fetchCourseBundle(trimmed);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load course details";
      return rejectWithValue(message);
    }
  },
);

const courseDetailSlice = createSlice({
  name: "courseDetail",
  initialState,
  reducers: {
    clearCourseDetail: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseBundle.pending, (state, action) => {
        const nextId = action.meta.arg.trim();
        const isNewCourse = state.courseId !== nextId;
        state.status = "loading";
        state.error = null;
        state.courseId = nextId;
        if (isNewCourse) {
          state.course = null;
          state.chapters = [];
          state.lessons = [];
          state.faqs = [];
        }
      })
      .addCase(fetchCourseBundle.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.course = action.payload.course;
        state.chapters = action.payload.chapters;
        state.lessons = action.payload.lessons;
        state.faqs = action.payload.faqs;
        state.error = null;
      })
      .addCase(fetchCourseBundle.rejected, (state, action) => {
        state.status = "failed";
        if (!state.course) {
          state.chapters = [];
          state.lessons = [];
          state.faqs = [];
        }
        state.error =
          (action.payload as string) ??
          action.error.message ??
          "Unknown error";
      });
  },
});

export const { clearCourseDetail } = courseDetailSlice.actions;
export default courseDetailSlice.reducer;
