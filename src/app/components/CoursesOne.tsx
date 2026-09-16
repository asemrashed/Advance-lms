"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import CourseCard from "./CourseCard";

interface Course {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPaid: boolean;
  price?: number;
  salePrice?: number;
  finalPrice: number;
  discountPercentage: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  lessonCount?: number;
  duration?: number;
  createdBy?: {
    name: string;
    email: string;
    role: string;
  };
  instructor?: {
    name: string;
    avatar?: string;
  } | string;
  categoryInfo?: {
    name: string;
    color?: string;
  } | null;
}

interface Category {
  _id: string;
  name: string;
  color?: string;
}

interface CourseCardData {
  id: number;
  courseId: string;
  image: string;
  level: string;
  levelColor: string;
  category: string;
  categoryColor: string;
  rating: string;
  title: string;
  lectures: number;
  hours: number;
  instructor: {
    name: string;
    avatar: string;
  };
  price: number;
  originalPrice: number | null;
}

export default function CoursesOne() {
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string>("All");
  const [selectedRatings, setSelectedRatings] = useState<string[]>(["5", "4", "3", "2", "1"]);
  const [sortBy, setSortBy] = useState<string>("default");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    pages: 0,
  });
  const coursesPerPage = 9;

  const ratings = [
    { stars: 5, count: 0 },
    { stars: 4, count: 0 },
    { stars: 3, count: 0 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ];

  // Helper function to get category color
  const getCategoryColor = (categoryName?: string, categoryColor?: string): string => {
    if (categoryColor && categoryColor.startsWith('#')) {
      // Convert hex to rgba for background with opacity
      const hex = categoryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `bg-[rgba(${r},${g},${b},0.1)] text-[${categoryColor}]`;
    }
    
    // Fallback colors
    const fallbackColors: Record<string, string> = {
      'Development': 'bg-green-100 text-green-600',
      'Art & Design': 'bg-purple-100 text-purple-600',
      'Business': 'bg-orange-100 text-orange-600',
      'IT & Software': 'bg-yellow-100 text-yellow-600',
      'Digital Marketing': 'bg-blue-100 text-blue-600',
      'Lifestyle': 'bg-red-100 text-red-600',
      'Marketing': 'bg-blue-100 text-blue-600',
      'Technology': 'bg-indigo-100 text-indigo-600',
      'Photography': 'bg-pink-100 text-pink-600',
      'Health & Fitness': 'bg-green-100 text-green-600',
      'Offices Productivity': 'bg-gray-100 text-gray-600',
    };
    return fallbackColors[categoryName || ''] || 'bg-gray-100 text-gray-600';
  };

  // Helper function to get level based on difficulty or default
  const getLevel = (difficulty?: string): { level: string; color: string } => {
    const levels: Record<string, { level: string; color: string }> = {
      'beginner': { level: 'Beginner', color: 'bg-blue-400' },
      'intermediate': { level: 'Intermediate', color: 'bg-yellow-500' },
      'advanced': { level: 'Advance', color: 'bg-red-500' },
    };
    return levels[difficulty || ''] || { level: 'All Level', color: 'bg-[#A855F7]' };
  };

  // Map API course to CourseCard format
  const mapCourseToCard = (course: Course, index: number): CourseCardData => {
    const levelInfo = getLevel(course.difficulty);
    const categoryColor = getCategoryColor(course.category, course.categoryInfo?.color);
    
    // Calculate hours from minutes (duration) or default to 0
    const hours = course.duration ? Math.round(course.duration / 60) : 0;
    
    // Get instructor name
    const instructorName = typeof course.instructor === 'object' 
      ? course.instructor?.name || course.createdBy?.name || 'Unknown Instructor'
      : course.createdBy?.name || 'Unknown Instructor';
    
    // Get instructor avatar
    const instructorAvatar = typeof course.instructor === 'object' && course.instructor?.avatar
      ? course.instructor.avatar
      : "https://live.themewild.com/edubo/assets/img/course/ins-1.jpg";
    
    return {
      id: index + 1,
      courseId: course._id,
      image: course.thumbnailUrl || "https://live.themewild.com/edubo/assets/img/course/05.jpg",
      level: levelInfo.level,
      levelColor: levelInfo.color,
      category: course.category || 'Uncategorized',
      categoryColor,
      rating: "0", // Will be updated when reviews are integrated
      title: course.title,
      lectures: course.lessonCount || 0,
      hours: hours || 0,
      instructor: {
        name: instructorName,
        avatar: instructorAvatar,
      },
      price: course.finalPrice || 0,
      originalPrice: course.discountPercentage > 0 && course.price ? course.price : null,
    };
  };

  // Fetch courses from API
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch with a high limit to get all courses, then filter client-side
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000', // Fetch all courses, then filter client-side
        ...(searchQuery && { search: searchQuery }),
        ...(selectedPrice !== 'All' && { pricing: selectedPrice.toLowerCase() }),
        ...(sortBy !== 'default' && {
          sortBy: sortBy === 'price-low' ? 'price' : sortBy === 'price-high' ? 'price' : 'createdAt',
          sortOrder: sortBy === 'price-low' ? 'asc' : sortBy === 'price-high' ? 'desc' : 'desc',
        }),
      });

      const response = await fetch(`/api/public/courses?${queryParams}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const fetchedCourses: Course[] = data.data.courses || [];
        setAllCourses(fetchedCourses);
      } else {
        console.error('Failed to fetch courses:', data.error);
        setAllCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setAllCourses([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedPrice, sortBy]);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/public/categories');
      const data = await response.json();
      if (response.ok && data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Filter and map courses
  useEffect(() => {
    let filtered = [...allCourses];

    // Filter by category (client-side for multiple categories)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(course => 
        course.category && selectedCategories.includes(course.category)
      );
    }

    // Filter by price (already handled by API, but keep for consistency)
    if (selectedPrice === 'Free') {
      filtered = filtered.filter(course => !course.isPaid);
    } else if (selectedPrice === 'Paid') {
      filtered = filtered.filter(course => course.isPaid);
    }

    // Map courses to card format
    const mappedCourses = filtered.map((course, index) => mapCourseToCard(course, index));
    setCourses(mappedCourses);
    
    // Update pagination based on filtered results
    const totalPages = Math.ceil(filtered.length / coursesPerPage);
    const safePage = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;
    
    setPagination({
      page: safePage,
      limit: coursesPerPage,
      total: filtered.length,
      pages: totalPages,
    });
    
    // Reset to page 1 if current page exceeds total pages
    if (currentPage > totalPages && totalPages > 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [allCourses, selectedCategories, selectedPrice, coursesPerPage, currentPage]);

  // Get category counts
  const getCategoryCounts = () => {
    const counts: Record<string, number> = {};
    allCourses.forEach(course => {
      if (course.category) {
        counts[course.category] = (counts[course.category] || 0) + 1;
      }
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    );
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePriceChange = (price: string) => {
    setSelectedPrice(price);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, selectedPrice, searchQuery, sortBy]);


  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-white py-12 px-4 md:px-6 lg:px-8">
        {/* Wavy Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg width="100%" height="100%" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path
              d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z"
              fill="url(#wave-gradient-courses)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="wave-gradient-courses" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Title */}
          <h1
            className="mb-4 text-center text-4xl font-bold text-[#7B2CBF] md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-bengali), sans-serif" }}
          >
            কোর্সসমূহ
          </h1>

          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Link
              href="/"
              className="hover:text-[#7B2CBF] transition-colors"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              হোম
            </Link>
            <span className="text-gray-400">{" >> "}</span>
            <span className="text-[#7B2CBF] font-semibold" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
              কোর্সসমূহ
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Sidebar - Filters */}
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Search Courses Card */}
            <div className="rounded-xl bg-[#fcf4fb] p-6 shadow-lg border border-gray-100">
              <h3
                className="mb-3 text-lg font-semibold text-[#1E3A8A]"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                Search Courses
              </h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
                  style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Filter Card */}
            <div className="rounded-xl bg-[#fcf4fb] p-6 shadow-lg border border-gray-100">
              <h3
                className="mb-3 text-lg font-semibold text-[#1E3A8A]"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                Category
              </h3>
              <div className="space-y-2">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                  <label
                      key={cat._id}
                    className="flex items-center justify-between cursor-pointer group hover:bg-white/50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.name)}
                        onChange={() => toggleCategory(cat.name)}
                        className="h-4 w-4 rounded border-gray-300 text-[#7B2CBF] focus:ring-[#7B2CBF]"
                      />
                      <span
                        className="text-sm text-gray-700 group-hover:text-[#7B2CBF] transition-colors"
                        style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                      >
                        {cat.name}
                      </span>
                    </div>
                      <span className="text-xs text-gray-500">({categoryCounts[cat.name] || 0})</span>
                  </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No categories available</p>
                )}
              </div>
            </div>

            {/* Course Price Filter Card */}
            <div className="rounded-xl bg-[#fcf4fb] p-6 shadow-lg border border-gray-100">
              <h3
                className="mb-3 text-lg font-semibold text-[#1E3A8A]"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                Course Price
              </h3>
              <div className="space-y-2">
                {["All", "Free", "Paid"].map((price) => (
                  <label
                    key={price}
                    className="flex items-center gap-2 cursor-pointer group hover:bg-white/50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="radio"
                      name="price"
                      value={price}
                      checked={selectedPrice === price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="h-4 w-4 border-gray-300 text-[#7B2CBF] focus:ring-[#7B2CBF]"
                    />
                    <span
                      className="text-sm text-gray-700 group-hover:text-[#7B2CBF] transition-colors"
                      style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                    >
                      {price === "All" ? "All" : price === "Free" ? "Free" : "Paid"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Course Rating Filter Card */}
            <div className="rounded-xl bg-[#fcf4fb] p-6 shadow-lg border border-gray-100">
              <h3
                className="mb-3 text-lg font-semibold text-[#1E3A8A]"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                Course Rating
              </h3>
              <div className="space-y-2">
                {ratings.map((rating) => (
                  <label
                    key={rating.stars}
                    className="flex items-center justify-between cursor-pointer group hover:bg-white/50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(rating.stars.toString())}
                        onChange={() => toggleRating(rating.stars.toString())}
                        className="h-4 w-4 rounded border-gray-300 text-[#7B2CBF] focus:ring-[#7B2CBF]"
                      />
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={i < rating.stars ? "#FBBF24" : "none"}
                            stroke="#FBBF24"
                            strokeWidth="1.5"
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">({rating.count})</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Main Content - Course Listings */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="mb-6 rounded-lg bg-[#fcf4fb] px-4 py-2">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p
                  className="text-sm font-medium text-gray-700"
                  style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                >
                  {loading ? (
                    "Loading..."
                  ) : (
                    `Showing ${((currentPage - 1) * coursesPerPage) + 1}-${Math.min(currentPage * coursesPerPage, pagination.total)} of ${pagination.total} Results`
                  )}
                </p>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-[#1E3A8A] focus:border-[#7B2CBF] focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    <option value="default">Sort By Default</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating</option>
                    <option value="newest">Newest</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500"
                    >
                      <path d="M6 9L12 15L18 9" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Grid */}
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-3xl bg-gray-200 h-96"
                  />
                ))}
              </div>
            ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.slice((currentPage - 1) * coursesPerPage, currentPage * coursesPerPage).map((course, index) => (
                <CourseCard
                    key={course.courseId}
                  course={course}
                  index={index}
                  isLoaded={true}
                />
              ))}
            </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-lg text-gray-500 mb-4" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  No courses found
                </p>
                <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  Try adjusting your filters
                </p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-10 flex items-center justify-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-[#1E3A8A] transition-all hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18L9 12L15 6" />
                </svg>
              </button>

              {/* Page Numbers */}
              {pagination.pages > 0 && Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg font-semibold transition-all ${
                    currentPage === page
                      ? "bg-[#7B2CBF] text-white"
                      : "bg-gray-100 text-[#1E3A8A] hover:bg-gray-200"
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage >= pagination.pages}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-[#1E3A8A] transition-all hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18L15 12L9 6" />
                </svg>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

