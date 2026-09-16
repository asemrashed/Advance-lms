import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import courseDetailReducer from "./slices/courseDetailSlice";
import coursesReducer from "./slices/coursesSlice";
import dashboardReducer from "./slices/dashboardSlice";
import studentPastPapersReducer from "./slices/studentPastPapersSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    courses: coursesReducer,
    courseDetail: courseDetailReducer,
    cart: cartReducer,
    dashboard: dashboardReducer,
    studentPastPapers: studentPastPapersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
