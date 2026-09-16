/** Mirrors learning-project user shape used in API responses (enrollment populate, etc.). */
export interface User {
  _id: string;
  /** Optional alias for `_id` (next-auth / session-style components). */
  id?: string;
  /** Display name for session-style UIs. */
  name: string;
  phone?: string;
  email?: string;
  role: "super_admin" | "admin" | "instructor" | "student";
  isActive: boolean;
  avatar?: string;
  /** Session / OAuth image URL (next-auth style). */
  image?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}
