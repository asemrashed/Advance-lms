import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Category from "@/models/Category";
import Course from "@/models/Course";
import { isAdminAreaRole } from "@/lib/roles";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  if (!isAdminAreaRole(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }
  return null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    const authError = await requireAdminSession();
    if (authError) {
      return authError;
    }

    await connectDB();
    const [categories, totalCategories, activeCategories] = await Promise.all([
      Category.find({}).select("_id name slug").lean(),
      Category.countDocuments({}),
      Category.countDocuments({ isActive: true }),
    ]);

    const linkedFlags = await Promise.all(
      categories.map(async (category: any) => {
        const matchSlug = String(category.slug || "").trim() || toSlug(String(category.name || ""));
        const count = await Course.countDocuments({
          $or: [
            { category: matchSlug },
            { category: String(category._id) },
            { category: String(category.name || "") },
          ],
        });
        return count > 0;
      }),
    );

    const categoriesWithCourses = linkedFlags.filter(Boolean).length;

    return NextResponse.json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        inactiveCategories: Math.max(totalCategories - activeCategories, 0),
        categoriesWithCourses,
      },
    });
  } catch (error) {
    console.error("Category stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category statistics" },
      { status: 500 },
    );
  }
}
