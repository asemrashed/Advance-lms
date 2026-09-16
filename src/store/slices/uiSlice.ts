import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DashboardRole } from "@/types/dashboard";

export interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  /** QA role switcher on `/dashboard`; removed in Phase 8. */
  dashboardView: DashboardRole;
}

const initialState: UIState = {
  theme: "light",
  sidebarOpen: true,
  dashboardView: "student",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    setDashboardView: (state, action: PayloadAction<DashboardRole>) => {
      state.dashboardView = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setDashboardView } = uiSlice.actions;
export default uiSlice.reducer;
