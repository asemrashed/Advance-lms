import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { studentPastPapersService } from "@/services/studentPastPapersService";
import type { PastPaperRow } from "@/types/pastPaper";
import type { EnrollmentListData } from "@/types/enrollmentList";

export const loadStudentPastPapers = createAsyncThunk(
  "studentPastPapers/load",
  async () => studentPastPapersService.load(),
);

export interface StudentPastPapersState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  enrollmentData: EnrollmentListData | null;
  enrolledCourseIds: string[];
  pastPapers: PastPaperRow[];
}

const initialState: StudentPastPapersState = {
  status: "idle",
  error: null,
  enrollmentData: null,
  enrolledCourseIds: [],
  pastPapers: [],
};

const studentPastPapersSlice = createSlice({
  name: "studentPastPapers",
  initialState,
  reducers: {
    clearStudentPastPapersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStudentPastPapers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadStudentPastPapers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.enrollmentData = action.payload.enrollmentData;
        state.enrolledCourseIds = action.payload.enrolledCourseIds;
        state.pastPapers = action.payload.pastPapers;
      })
      .addCase(loadStudentPastPapers.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.error.message ?? "Could not load past papers for your courses.";
      });
  },
});

export const { clearStudentPastPapersError } = studentPastPapersSlice.actions;
export default studentPastPapersSlice.reducer;
