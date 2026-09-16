import type { Metadata } from "next";
import TeachersPage from "./AdminTeachersClient";

export const metadata: Metadata = {
  title: "Teachers",
};

export default function AdminTeachersRoutePage() {
  return <TeachersPage />;
}
