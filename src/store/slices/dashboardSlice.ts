import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { dashboardService } from "@/services/dashboardService";
import type {
  AdminDashboardApiPayload,
  DashboardRole,
  InstructorDashboardApiPayload,
} from "@/types/dashboard";
import type { StudentDashboardComposite } from "@/types/studentDashboard";

export type DashboardLoadStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

export interface DashboardState {
  status: DashboardLoadStatus;
  error: string | null;
  lastFetchedRole: DashboardRole | null;
  student: StudentDashboardComposite | null;
  instructor: InstructorDashboardApiPayload | null;
  admin: AdminDashboardApiPayload | null;
}

const initialState: DashboardState = {
  status: "idle",
  error: null,
  lastFetchedRole: null,
  student: null,
  instructor: null,
  admin: null,
};

export const fetchDashboard = createAsyncThunk(
  "dashboard/fetch",
  async (role: DashboardRole, { rejectWithValue }) => {
    try {
      return await dashboardService.fetchDashboard(role);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load dashboard";
      return rejectWithValue(message);
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastFetchedRole = action.payload.role;
        const { role, data } = action.payload;
        if (role === "student") state.student = data;
        if (role === "instructor") state.instructor = data;
        if (role === "admin") state.admin = data;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "Failed to load dashboard";
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
