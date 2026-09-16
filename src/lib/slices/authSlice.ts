/** Learning-project path alias — re-export store auth API. */
export {
  default,
  resetAuth,
  setUser,
  checkAuthStatus,
  logoutUser,
} from "@/store/slices/authSlice";
export type { AuthState } from "@/store/slices/authSlice";
