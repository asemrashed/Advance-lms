import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PublicCourseRow } from "@/types/public-course";
import type { PublicCoursesQuery } from "@/lib/api/types";
import * as publicCoursesService from "@/services/publicCoursesService";

export type PublicCoursesLoadStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

export interface CoursesState {
  publicList: PublicCourseRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  status: PublicCoursesLoadStatus;
  error: string | null;
}

const initialState: CoursesState = {
  publicList: [],
  pagination: null,
  status: "idle",
  error: null,
};

export const fetchPublicCourses = createAsyncThunk(
  "courses/fetchPublic",
  async (query: PublicCoursesQuery | undefined, { rejectWithValue }) => {
    try {
      return await publicCoursesService.fetchPublicCourses(query ?? {});
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load public courses";
      return rejectWithValue(message);
    }
  },
);

const coursesSlice = createSlice({
  name: "courses",
  initialState,
  reducers: {
    clearPublicCoursesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicCourses.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPublicCourses.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.publicList = action.payload.data.courses;
        state.pagination = action.payload.data.pagination;
        state.error = null;
      })
      .addCase(fetchPublicCourses.rejected, (state, action) => {
        state.status = "failed";
        if (state.publicList.length === 0) {
          state.pagination = null;
        }
        state.error =
          (action.payload as string) ??
          action.error.message ??
          "Unknown error";
      });
  },
});

export const { clearPublicCoursesError } = coursesSlice.actions;
export default coursesSlice.reducer;
