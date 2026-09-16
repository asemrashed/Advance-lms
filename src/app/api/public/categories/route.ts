import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Category from "@/models/Category";
import Course from "@/models/Course";

type SidebarCategory = {
  id: string;
  label: string;
  count: number;
};
type Category = {
  _id: string;
  name: string;
  slug: string;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find({ isActive: { $ne: false } })
      .select("name slug")
      .sort({ name: 1 })
      .lean();

    const data: SidebarCategory[] = await Promise.all(
      categories.map(async (category: Category) => {
        const idFromDb = String(category.slug || "").trim();
        const fallbackSlug = toSlug(String(category.name || ""));
        const categoryId = idFromDb || fallbackSlug || String(category._id);

        const count = await Course.countDocuments({
          status: "published",
          isHidden: { $ne: true },
          $or: [
            { category: categoryId },
            { category: String(category._id) },
            { category: String(category.name || "") },
          ],
        });

        return {
          id: categoryId,
          label: String(category.name || categoryId),
          count,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching public categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
