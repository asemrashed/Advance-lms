'use client';

import { useState, useEffect } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LuSave as Save,
  LuRefreshCw as RefreshCw,
  LuCheck as CheckCircle,
  LuX as X,
} from 'react-icons/lu';
import {
  defaultAboutContent,
  defaultCourseLessonBannerContent,
  defaultCoursesByCategoryContent,
  defaultCoursesContent,
  defaultHomeInstructorsContent,
  defaultFAQContent,
  defaultBlogContent,
  defaultFooterContent,
  defaultWebsiteContent,
  defaultPromoBannerContent,
  defaultSectionOrder,
  defaultContactPageContent,
  defaultAboutPageContent,
  defaultFeaturesContent,
  defaultStatisticsContent,
  defaultPartnersContent,
  stripLegacyWebsiteContentKeys,
  sanitizeWebsiteContentForSave,
} from '@/lib/websiteContentDefaults';
import { mergeEditorialHeroContent } from '@/lib/mergeHeroContent';
import { resolveAdminHomeSectionOrder } from '@/lib/homeSectionOrder';

function setAtPath(
  source: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) return source;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...source, [head]: value };
  }
  const child = source[head];
  const nextChild =
    child && typeof child === 'object' && !Array.isArray(child)
      ? setAtPath(child as Record<string, unknown>, rest, value)
      : setAtPath({}, rest, value);
  return { ...source, [head]: nextChild };
}
import { websiteContentAdminService } from '@/services/websiteContentAdminService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { courseReviewService } from '@/services/courseReviewService';
import { imageUrlError } from '@/lib/imageUrl';
import type { WebsiteContent } from './sections/types';
import { CMS_SIDEBAR_GROUPS, getCmsTabLabel } from './cmsSidebarConfig';
import { CmsSectionsLayout } from './CmsSectionsLayout';
import { ContactPageSection } from './sections/ContactPageSection';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { StatisticsSection } from './sections/StatisticsSection';
import { FAQSection } from './sections/FAQSection';
import { BlogSection } from './sections/BlogSection';
import { PartnersSection } from './sections/PartnersSection';
import { BrandingSection } from './sections/BrandingSection';
import { NavigationSection } from './sections/NavigationSection';
import { FooterSection } from './sections/FooterSection';
import { ReviewsSection } from './sections/ReviewsSection';
import { CoursesSection } from './sections/CoursesSection';
import { StudentPortalSection } from './sections/StudentPortalSection';
import { BatchesSection } from './sections/BatchesSection';
import { InstructorsSection } from './sections/InstructorsSection';
import { PromoBannersSection } from './sections/PromoBannersSection';
import { SectionOrderSection } from './sections/SectionOrderSection';

function WebsiteContentPageContent() {
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [editingNavItem, setEditingNavItem] = useState<{ section: string; index: number } | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);
  
  // Reviews management state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [creatingReview, setCreatingReview] = useState(false);
  const [reviewCourses, setReviewCourses] = useState<Array<{ _id: string; title: string }>>([]);
  const [newReview, setNewReview] = useState({
    course: '',
    rating: 5,
    reviewType: 'text' as 'text' | 'video',
    title: '',
    comment: '',
    videoUrl: '',
    videoThumbnail: '',
    isPublic: true,
    isApproved: true,
    isDisplayed: false,
  });

  // Published courses list for "Featured courses" selector (courses tab)
  const [publishedCoursesList, setPublishedCoursesList] = useState<Array<{ _id: string; title: string }>>([]);
  const [publishedBatchesList, setPublishedBatchesList] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    fetchContent();
  }, []);

  // Fetch published courses when courses tab is active (for featured course selector)
  useEffect(() => {
    if (activeTab !== 'courses') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await coursesStaffService.listCourses('limit=500&page=1&status=published');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list = data?.data?.courses ?? data?.courses ?? [];
        if (!cancelled) setPublishedCoursesList(Array.isArray(list) ? list.map((c: any) => ({ _id: c._id, title: c.title || c._id })) : []);
      } catch {
        if (!cancelled) setPublishedCoursesList([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Ensure about content is initialized when switching to about tab
  useEffect(() => {
    if (activeTab === 'about' && content && !content.aboutPage?.heading) {
      setContent({
        ...content,
        aboutPage: { ...defaultAboutPageContent, ...(content.aboutPage || {}) },
      });
    }
    if (activeTab === 'features' && content && !content.features?.sectionHeading) {
      setContent({
        ...content,
        features: {
          ...defaultFeaturesContent,
          ...(content.features || {}),
          features:
            content.features?.features?.length
              ? content.features.features
              : defaultFeaturesContent.features,
        },
      });
    }
    if (activeTab === 'statistics' && content && !content.statistics?.items?.length) {
      setContent({
        ...content,
        statistics: {
          ...defaultStatisticsContent,
          ...(content.statistics || {}),
          items:
            content.statistics?.items?.length
              ? content.statistics.items
              : defaultStatisticsContent.items,
        },
      });
    }
    if (activeTab === 'instructors' && content && !content.homeInstructors?.sectionHeading) {
      setContent({
        ...content,
        homeInstructors: {
          ...defaultHomeInstructorsContent,
          ...(content.homeInstructors || {}),
          instructorIds: content.homeInstructors?.instructorIds ?? [],
        },
      });
    }
    if (activeTab === 'blog' && content && !content.blog?.title?.part1) {
      setContent({
        ...content,
        blog: {
          ...defaultBlogContent,
          ...(content.blog || {}),
          title: { ...defaultBlogContent.title, ...(content.blog?.title || {}) },
          featuredPostIds: content.blog?.featuredPostIds ?? [],
        },
      });
    }
    // Ensure FAQ content is initialized when switching to FAQ tab
    if (activeTab === 'faq' && content && (!content.faq || !content.faq.faqs || content.faq.faqs.length === 0)) {
      const updatedFAQ = { 
        ...defaultFAQContent, 
        ...(content.faq || {}),
        // Ensure nested objects are properly merged
        label: { ...defaultFAQContent.label, ...(content.faq?.label || {}) },
        title: { ...defaultFAQContent.title, ...(content.faq?.title || {}) },
        titleColors: { ...defaultFAQContent.titleColors, ...(content.faq?.titleColors || {}) },
        gradientColors: content.faq?.gradientColors || defaultFAQContent.gradientColors,
        faqs: content.faq?.faqs && content.faq.faqs.length > 0 
          ? content.faq.faqs 
          : [...defaultFAQContent.faqs],
      };
      setContent({
        ...content,
        faq: updatedFAQ
      });
    }
    // Ensure promotional banner is initialized when switching to promoBanner tab
    if (activeTab === 'promoBanner' && content && (!content.promotionalBanner || content.promotionalBanner.headline === undefined)) {
      setContent({
        ...content,
        promotionalBanner: { ...defaultPromoBannerContent, ...(content.promotionalBanner || {}) },
      });
    }
    // Ensure course lesson banner is initialized when switching to courseLessonBanner tab
    if (activeTab === 'courseLessonBanner' && content && (!content.courseLessonBanner || content.courseLessonBanner.title === undefined)) {
      setContent({
        ...content,
        courseLessonBanner: { ...defaultCourseLessonBannerContent, ...(content.courseLessonBanner || {}) },
      });
    }
    // Ensure courses content is initialized when switching to courses tab
    if (activeTab === 'courses' && content && (!content.courses || !content.courses.title || !content.courses.buttonText)) {
      const updatedCourses = { 
        ...defaultCoursesContent, 
        ...(content.courses || {}),
        // Ensure nested objects are properly merged
        label: { ...defaultCoursesContent.label, ...(content.courses?.label || {}) },
        title: { ...defaultCoursesContent.title, ...(content.courses?.title || {}) },
        titleColors: { ...defaultCoursesContent.titleColors, ...(content.courses?.titleColors || {}) },
        gradientColors: { ...defaultCoursesContent.gradientColors, ...(content.courses?.gradientColors || {}) },
        featuredCourseIds: content.courses?.featuredCourseIds ?? defaultCoursesContent.featuredCourseIds,
      };
      setContent({
        ...content,
        courses: updatedCourses
      });
    }
    // Ensure coursesByCategory content is initialized when switching to coursesByCategory tab
    if (activeTab === 'coursesByCategory' && content && (!content.coursesByCategory || !content.coursesByCategory.title || !content.coursesByCategory.buttonText)) {
      const updatedCoursesByCategory = { 
        ...defaultCoursesByCategoryContent, 
        ...(content.coursesByCategory || {}),
        // Ensure nested objects are properly merged
        label: { ...defaultCoursesByCategoryContent.label, ...(content.coursesByCategory?.label || {}) },
        title: { ...defaultCoursesByCategoryContent.title, ...(content.coursesByCategory?.title || {}) },
        titleColors: { ...defaultCoursesByCategoryContent.titleColors, ...(content.coursesByCategory?.titleColors || {}) },
        gradientColors: { ...defaultCoursesByCategoryContent.gradientColors, ...(content.coursesByCategory?.gradientColors || {}) },
      };
      setContent({
        ...content,
        coursesByCategory: updatedCoursesByCategory
      });
    }
    // Ensure footer content is initialized when switching to footer tab
    if (activeTab === 'footer' && content && (!content.footer || !content.footer.branding || !content.footer.companyLinks || content.footer.companyLinks.length === 0)) {
      const updatedFooter = { 
        ...defaultFooterContent, 
        ...(content.footer || {}),
        // Ensure nested objects are properly merged
        branding: { ...defaultFooterContent.branding, ...(content.footer?.branding || {}) },
        newsletter: { ...defaultFooterContent.newsletter, ...(content.footer?.newsletter || {}) },
        contact: { 
          address: { ...defaultFooterContent.contact.address, ...(content.footer?.contact?.address || {}) },
          phone: { ...defaultFooterContent.contact.phone, ...(content.footer?.contact?.phone || {}) },
          email: { ...defaultFooterContent.contact.email, ...(content.footer?.contact?.email || {}) },
        },
        backgroundGradient: { ...defaultFooterContent.backgroundGradient, ...(content.footer?.backgroundGradient || {}) },
        companyLinks: content.footer?.companyLinks && content.footer.companyLinks.length > 0 
          ? content.footer.companyLinks 
          : [...defaultFooterContent.companyLinks],
        quickLinks: content.footer?.quickLinks && content.footer.quickLinks.length > 0 
          ? content.footer.quickLinks 
          : [...defaultFooterContent.quickLinks],
      };
      setContent({
        ...content,
        footer: updatedFooter
      });
    }
    if (activeTab === 'contactPage' && content && !content.contactPage?.headline) {
      setContent({
        ...content,
        contactPage: { ...defaultContactPageContent, ...(content.contactPage || {}) },
      });
    }
  }, [activeTab]); // Only depend on activeTab to avoid infinite loops

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      // Admin portal: no cache, always fetch fresh data
      const response = await websiteContentAdminService.getWebsiteContent();
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      const fetchedContent = stripLegacyWebsiteContentKeys(
        (data.data || {}) as Record<string, unknown>,
      ) as unknown as WebsiteContent;
      fetchedContent.hero = mergeEditorialHeroContent(fetchedContent.hero);
      // Ensure about content uses defaultAboutContent if missing or incomplete
      if (!fetchedContent.about || !fetchedContent.about.label || !fetchedContent.about.title || !fetchedContent.about.description) {
        fetchedContent.about = { 
          ...defaultAboutContent, 
          ...(fetchedContent.about || {}),
          // Ensure nested objects are properly merged
          label: { ...defaultAboutContent.label, ...(fetchedContent.about?.label || {}) },
          title: { ...defaultAboutContent.title, ...(fetchedContent.about?.title || {}) },
          titleColors: { ...defaultAboutContent.titleColors, ...(fetchedContent.about?.titleColors || {}) },
          experience: { ...defaultAboutContent.experience, ...(fetchedContent.about?.experience || {}) },
          images: { ...defaultAboutContent.images, ...(fetchedContent.about?.images || {}) },
          button: { ...defaultAboutContent.button, ...(fetchedContent.about?.button || {}) },
        };
      }
      // Ensure features array exists and has items
      if (!fetchedContent.about.features || fetchedContent.about.features.length === 0) {
        fetchedContent.about.features = [...defaultAboutContent.features];
      }
      // Ensure courses content uses defaultCoursesContent if missing or incomplete
      if (!fetchedContent.courses || !fetchedContent.courses.title || !fetchedContent.courses.buttonText) {
        fetchedContent.courses = { 
          ...defaultCoursesContent, 
          ...(fetchedContent.courses || {}),
          // Ensure nested objects are properly merged
          label: { ...defaultCoursesContent.label, ...(fetchedContent.courses?.label || {}) },
          title: { ...defaultCoursesContent.title, ...(fetchedContent.courses?.title || {}) },
          titleColors: { ...defaultCoursesContent.titleColors, ...(fetchedContent.courses?.titleColors || {}) },
          gradientColors: { ...defaultCoursesContent.gradientColors, ...(fetchedContent.courses?.gradientColors || {}) },
        };
      }
      // Ensure contact has registrationNumber
      if (!fetchedContent.contact || !fetchedContent.contact.registrationNumber) {
        fetchedContent.contact = {
          registrationNumber: fetchedContent.contact?.registrationNumber || 'বাংলাদেশ সরকার অনুমোদিত রেজিঃ নং- ৩১১০৫'
        };
      }
      if (!fetchedContent.contactPage || !fetchedContent.contactPage.headline) {
        fetchedContent.contactPage = {
          ...defaultContactPageContent,
          ...(fetchedContent.contactPage || {}),
        };
      }
      if (!fetchedContent.aboutPage || !fetchedContent.aboutPage.heading) {
        fetchedContent.aboutPage = {
          ...defaultAboutPageContent,
          ...(fetchedContent.aboutPage || {}),
        };
      }
      if (!fetchedContent.features?.sectionHeading) {
        fetchedContent.features = {
          ...defaultFeaturesContent,
          ...(fetchedContent.features || {}),
          features:
            fetchedContent.features?.features?.length
              ? fetchedContent.features.features
              : defaultFeaturesContent.features,
        };
      }
      if (!fetchedContent.homeInstructors?.sectionHeading) {
        fetchedContent.homeInstructors = {
          ...defaultHomeInstructorsContent,
          ...(fetchedContent.homeInstructors || {}),
          instructorIds: fetchedContent.homeInstructors?.instructorIds ?? [],
        };
      }
      if (!fetchedContent.blog?.title?.part1) {
        fetchedContent.blog = {
          ...defaultBlogContent,
          ...(fetchedContent.blog || {}),
          title: { ...defaultBlogContent.title, ...(fetchedContent.blog?.title || {}) },
          featuredPostIds: fetchedContent.blog?.featuredPostIds ?? [],
        };
      }
      // Ensure meta title and branding defaults exist
      if (!fetchedContent.metaTitle) {
        fetchedContent.metaTitle = defaultWebsiteContent.metaTitle;
      }
      fetchedContent.branding = Object.assign(
        {},
        defaultWebsiteContent.branding,
        fetchedContent.branding || {},
      );
      // Ensure promotional banner has defaults
      if (!fetchedContent.promotionalBanner || fetchedContent.promotionalBanner.headline === undefined) {
        fetchedContent.promotionalBanner = { ...defaultPromoBannerContent, ...(fetchedContent.promotionalBanner || {}) };
      }
      // Ensure course lesson banner has defaults
      if (!fetchedContent.courseLessonBanner || fetchedContent.courseLessonBanner.title === undefined) {
        fetchedContent.courseLessonBanner = { ...defaultCourseLessonBannerContent, ...(fetchedContent.courseLessonBanner || {}) };
      }
      fetchedContent.studentPortal = {
        ...defaultWebsiteContent.studentPortal,
        ...(fetchedContent.studentPortal || {}),
      };
      if (!fetchedContent.mobileMenu?.items?.length) {
        fetchedContent.mobileMenu = {
          items: [...defaultWebsiteContent.mobileMenu.items],
        };
      }
      if (!fetchedContent.partners?.items?.length) {
        const legacyMethods = (
          fetchedContent.footer as { paymentGateway?: { methods?: string[]; title?: string } }
        )?.paymentGateway?.methods;
        if (legacyMethods?.length) {
          fetchedContent.partners = {
            title:
              (fetchedContent.footer as { paymentGateway?: { title?: string } })
                ?.paymentGateway?.title || defaultPartnersContent.title,
            items: legacyMethods.map((name: string) => ({
              name,
              imageUrl: "",
              href: "",
            })),
          };
        } else {
          fetchedContent.partners = { ...defaultPartnersContent };
        }
      }
      setContent(fetchedContent);
    } catch (error) {
      console.error('Error fetching content:', error);
      setSaveStatus('error');
      // Initialize with default content on error
      setContent({ ...defaultWebsiteContent } as WebsiteContent);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all reviews
  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await courseReviewService.listReviews('limit=1000');
      if (response.ok) {
        const data = await response.json();
        const reviewsData = data.data?.reviews || data.reviews || [];
        // Normalize isDisplayed field - treat undefined as false for UI consistency
        const normalizedReviews = reviewsData.map((review: any) => ({
          ...review,
          isDisplayed: review.isDisplayed !== undefined ? review.isDisplayed : false
        }));
        setReviews(normalizedReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchReviewFormOptions = async () => {
    try {
      const coursesResponse = await coursesStaffService.listCourses('limit=500&page=1');

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        const list = coursesData?.data?.courses || coursesData?.courses || [];
        setReviewCourses(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Error fetching review form options:', error);
    }
  };

  const resetNewReviewForm = () => {
    setNewReview({
      course: '',
      rating: 5,
      reviewType: 'text',
      title: '',
      comment: '',
      videoUrl: '',
      videoThumbnail: '',
      isPublic: true,
      isApproved: true,
      isDisplayed: false,
    });
  };

  const handleCreateReview = async () => {
    if (!newReview.course) {
      alert('Please select a course');
      return;
    }

    if (newReview.reviewType === 'text' && !newReview.comment.trim()) {
      alert('Comment is required for text reviews');
      return;
    }

    if (newReview.reviewType === 'video' && !newReview.videoUrl.trim()) {
      alert('Video URL is required for video reviews');
      return;
    }

    const thumbnailError = imageUrlError(newReview.videoThumbnail.trim());
    if (thumbnailError) {
      alert(thumbnailError);
      return;
    }

    try {
      setCreatingReview(true);
      const response = await courseReviewService.createAdminReview({
        ...newReview,
        title: newReview.title.trim() || undefined,
        comment: newReview.comment.trim() || undefined,
        videoUrl: newReview.videoUrl.trim() || undefined,
        videoThumbnail: newReview.videoThumbnail.trim() || undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to create review');
        return;
      }

      setShowAddReviewModal(false);
      resetNewReviewForm();
      await fetchReviews();
      alert('Review added successfully');
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Error creating review');
    } finally {
      setCreatingReview(false);
    }
  };

  // Toggle review display status
  const toggleReviewDisplay = async (reviewId: string, currentStatus: boolean) => {
    try {
      // If currentStatus is undefined/null, treat it as false
      const currentValue = currentStatus === true;
      const newValue = !currentValue;

      // If enabling display, set displayOrder to the end of displayed reviews
      let displayOrder = 0;
      if (newValue) {
        const currentDisplayedCount = reviews.filter(r => r.isDisplayed === true).length;
        displayOrder = currentDisplayedCount + 1;
      }

      const response = await courseReviewService.updateAdminReview(reviewId, {
        isDisplayed: newValue,
        displayOrder: newValue ? displayOrder : 0,
      });

      if (response.ok) {
        // Update local state - ensure isDisplayed is always a boolean
        setReviews(prevReviews =>
          prevReviews.map(review =>
            review._id === reviewId
              ? { ...review, isDisplayed: newValue, displayOrder: newValue ? displayOrder : 0 }
              : review
          )
        );
      } else {
        const data = await response.json();
        console.error('Failed to update review:', data.error);
        alert('Failed to update review display status');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Error updating review display status');
    }
  };

  // Update review display order
  const updateReviewOrder = async (reorderedDisplayedReviews: any[]) => {
    try {
      // Update displayOrder for all displayed reviews
      const updatePromises = reorderedDisplayedReviews
        .filter(review => review.isDisplayed === true)
        .map((review, index) => 
          courseReviewService.updateAdminReview(review._id, {
            displayOrder: index + 1,
          })
        );

      const responses = await Promise.all(updatePromises);
      if (responses.some((response) => !response.ok)) {
        alert('Failed to update review order');
        return;
      }

      const displayOrderMap = new Map(
        reorderedDisplayedReviews
          .filter((review) => review.isDisplayed === true)
          .map((review, index) => [review._id, index + 1])
      );

      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.isDisplayed === true && displayOrderMap.has(review._id)
            ? { ...review, displayOrder: displayOrderMap.get(review._id) }
            : review
        )
      );
    } catch (error) {
      console.error('Error updating review order:', error);
      alert('Error updating review order');
    }
  };

  // Fetch reviews when reviews tab is active
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
      fetchReviewFormOptions();
    }
  }, [activeTab]);


  function getReviewStudentLabel(review: any) {
    const customName = review?.displayStudentName?.trim();
    if (customName) return customName;
    return review?.student?.name || 'Unknown';
  }

  // Filter reviews based on search
  const filteredReviews = reviews.filter((review) => {
    if (!reviewSearch) return true;
    const searchLower = reviewSearch.toLowerCase();
    const studentName = getReviewStudentLabel(review).toLowerCase();
    const courseTitle = typeof review.course === 'object' ? review.course?.title || '' : '';
    const reviewTitle = review.title || '';
    const reviewComment = review.comment || '';
    
    return (
      studentName.includes(searchLower) ||
      courseTitle.toLowerCase().includes(searchLower) ||
      reviewTitle.toLowerCase().includes(searchLower) ||
      reviewComment.toLowerCase().includes(searchLower)
    );
  });

  // Separate displayed and hidden reviews for ordering
  const displayedReviews = filteredReviews
    .filter(review => review.isDisplayed === true)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const hiddenReviews = filteredReviews.filter(review => review.isDisplayed !== true);

  const handleSave = async () => {
    if (!content) return;
    
    try {
      setIsSaving(true);
      
      const response = await websiteContentAdminService.saveWebsiteContent(
        {
          settings: sanitizeWebsiteContentForSave(
            content as unknown as Record<string, unknown>,
          ),
        },
        'POST',
      );

      if (!response.ok) {
        let message = 'Failed to save content';
        try {
          const data = await response.json();
          if (typeof data?.error === 'string' && data.error.trim()) {
            message = data.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      
      setSaveStatus('success');
      setSaveErrorMessage(null);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving content:', error);
      setSaveErrorMessage(
        error instanceof Error ? error.message : 'Failed to save content',
      );
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all content to default?')) return;
    
    try {
      setIsSaving(true);
      const response = await websiteContentAdminService.resetWebsiteContent();

      if (!response.ok) throw new Error('Failed to reset content');
      
      const data = await response.json();
      setContent(data.data);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error resetting content:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateContent = (path: string[], value: unknown) => {
    setContent((prev) => {
      if (!prev) return prev;
      return setAtPath(
        prev as unknown as Record<string, unknown>,
        path,
        value,
      ) as unknown as WebsiteContent;
    });
  };

  const setRecordedCoursesPublicVisibility = (enabled: boolean) => {
    setContent((prev) => {
      if (!prev) return prev;
      const updatedOrder = resolveAdminHomeSectionOrder(prev.sectionOrder).map(
        (section) =>
          section.id === 'courses' ? { ...section, enabled } : section,
      );
      let next = setAtPath(
        prev as unknown as Record<string, unknown>,
        ['sectionOrder'],
        updatedOrder,
      );
      next = setAtPath(next, ['studentPortal', 'recordedCoursesEnabled'], enabled);
      return next as unknown as WebsiteContent;
    });
  };

  const addFeaturedCourse = (courseId: string) => {
    if (!content || !courseId) return;
    const currentIds = content.courses?.featuredCourseIds ?? [];
    if (currentIds.includes(courseId)) return;
    if (currentIds.length >= 8) {
      alert('You can select up to 8 featured courses.');
      return;
    }
    updateContent(['courses', 'featuredCourseIds'], [...currentIds, courseId]);
  };

  const removeFeaturedCourse = (courseId: string) => {
    if (!content) return;
    const currentIds = content.courses?.featuredCourseIds ?? [];
    updateContent(
      ['courses', 'featuredCourseIds'],
      currentIds.filter((id) => id !== courseId)
    );
  };

  const addFeaturedBatch = (batchId: string) => {
    if (!content || !batchId) return;
    const currentIds = content.batches?.featuredBatchIds ?? [];
    if (currentIds.includes(batchId)) return;
    if (currentIds.length >= 4) {
      alert('You can select up to 4 featured batches for the home page.');
      return;
    }
    updateContent(['batches', 'featuredBatchIds'], [...currentIds, batchId]);
  };

  const removeFeaturedBatch = (batchId: string) => {
    if (!content) return;
    const currentIds = content.batches?.featuredBatchIds ?? [];
    updateContent(
      ['batches', 'featuredBatchIds'],
      currentIds.filter((id: string) => id !== batchId),
    );
  };

  const moveFeaturedBatch = (batchId: string, direction: 'up' | 'down') => {
    if (!content) return;
    const currentIds = [...(content.batches?.featuredBatchIds ?? [])];
    const index = currentIds.indexOf(batchId);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= currentIds.length) return;
    [currentIds[index], currentIds[swapIndex]] = [currentIds[swapIndex], currentIds[index]];
    updateContent(['batches', 'featuredBatchIds'], currentIds);
  };

  const addFeaturedPost = (postId: string) => {
    if (!content || !postId) return;
    const currentIds = content.blog?.featuredPostIds ?? [];
    if (currentIds.includes(postId)) return;
    if (currentIds.length >= 3) {
      alert('You can select up to 3 featured blog posts for the home page.');
      return;
    }
    updateContent(['blog', 'featuredPostIds'], [...currentIds, postId]);
  };

  const removeFeaturedPost = (postId: string) => {
    if (!content) return;
    const currentIds = content.blog?.featuredPostIds ?? [];
    updateContent(
      ['blog', 'featuredPostIds'],
      currentIds.filter((id: string) => id !== postId),
    );
  };

  const moveFeaturedPost = (postId: string, direction: 'up' | 'down') => {
    if (!content) return;
    const currentIds = [...(content.blog?.featuredPostIds ?? [])];
    const index = currentIds.indexOf(postId);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= currentIds.length) return;
    [currentIds[index], currentIds[swapIndex]] = [currentIds[swapIndex], currentIds[index]];
    updateContent(['blog', 'featuredPostIds'], currentIds);
  };

  const moveFeaturedCourse = (courseId: string, direction: 'up' | 'down') => {
    if (!content) return;
    const currentIds = [...(content.courses?.featuredCourseIds ?? [])];
    const index = currentIds.indexOf(courseId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    [currentIds[index], currentIds[targetIndex]] = [currentIds[targetIndex], currentIds[index]];
    updateContent(['courses', 'featuredCourseIds'], currentIds);
  };

  const addFeaturedInstructor = (instructorId: string) => {
    if (!content || !instructorId) return;
    const currentIds = content.homeInstructors?.instructorIds ?? [];
    if (currentIds.includes(instructorId)) return;
    if (currentIds.length >= 12) {
      alert('You can select up to 12 instructors for the homepage.');
      return;
    }
    updateContent(['homeInstructors', 'instructorIds'], [...currentIds, instructorId]);
  };

  const removeFeaturedInstructor = (instructorId: string) => {
    if (!content) return;
    const currentIds = content.homeInstructors?.instructorIds ?? [];
    updateContent(
      ['homeInstructors', 'instructorIds'],
      currentIds.filter((id) => id !== instructorId),
    );
  };

  const moveFeaturedInstructor = (instructorId: string, direction: 'up' | 'down') => {
    if (!content) return;
    const currentIds = [...(content.homeInstructors?.instructorIds ?? [])];
    const index = currentIds.indexOf(instructorId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;
    [currentIds[index], currentIds[targetIndex]] = [currentIds[targetIndex], currentIds[index]];
    updateContent(['homeInstructors', 'instructorIds'], currentIds);
  };

  const handleBrandingUpload = async (event: any, assetType: 'logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file || !content) return;

    try {
      setUploadingAsset(assetType);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetType', assetType);

      const response = await websiteContentAdminService.uploadBranding(formData);

      const data = await response.json();
      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error || `Failed to upload ${assetType}`);
      }

      updateContent(['branding', assetType === 'logo' ? 'logoUrl' : 'faviconUrl'], data.imageUrl);
    } catch (error) {
      console.error(`Error uploading ${assetType}:`, error);
      alert(error instanceof Error ? error.message : `Failed to upload ${assetType}`);
    } finally {
      setUploadingAsset(null);
      event.target.value = '';
    }
  };

  const addNavItem = (section: string) => {
    if (!content) return;
    const navSection = content.navigation[section as keyof typeof content.navigation];
    if ('items' in navSection && Array.isArray(navSection.items)) {
      const newItems = [...navSection.items, { label: '', href: '' }];
      updateContent(['navigation', section, 'items'], newItems);
      setEditingNavItem({ section, index: newItems.length - 1 });
    }
  };

  const removeNavItem = (section: string, index: number) => {
    if (!content) return;
    const navSection = content.navigation[section as keyof typeof content.navigation];
    if ('items' in navSection && Array.isArray(navSection.items)) {
      const newItems = navSection.items.filter((_, i) => i !== index);
      updateContent(['navigation', section, 'items'], newItems);
    }
  };
  const renderActivePanel = () => {
    if (!content) return null;

    if (activeTab === 'hero') {
      return <HeroSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'about') {
      return (
        <AboutSection
          content={content}
          updateContent={updateContent}
          onManageFeatures={() => setActiveTab('features')}
        />
      );
    }
    if (activeTab === 'features') {
      return <FeaturesSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'statistics') {
      return <StatisticsSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'contactPage') {
      return <ContactPageSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'instructors') {
      return (
        <InstructorsSection
          content={content}
          updateContent={updateContent}
          addFeaturedInstructor={addFeaturedInstructor}
          removeFeaturedInstructor={removeFeaturedInstructor}
          moveFeaturedInstructor={moveFeaturedInstructor}
        />
      );
    }
    if (activeTab === 'blog') {
      return (
        <BlogSection
          content={content}
          updateContent={updateContent}
          addFeaturedPost={addFeaturedPost}
          removeFeaturedPost={removeFeaturedPost}
          moveFeaturedPost={moveFeaturedPost}
        />
      );
    }
    if (activeTab === 'faq') {
      return <FAQSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'promoBanner' || activeTab === 'courseLessonBanner') {
      return (
        <PromoBannersSection
          content={content}
          updateContent={updateContent}
          activeSubTab={activeTab as 'promoBanner' | 'courseLessonBanner'}
          onSubTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }
    if (activeTab === 'sectionOrder') {
      return (
        <SectionOrderSection
          content={content}
          updateContent={updateContent}
          setRecordedCoursesPublicVisibility={setRecordedCoursesPublicVisibility}
          sensors={sensors}
        />
      );
    }
    if (activeTab === 'branding') {
      return (
        <BrandingSection
          content={content}
          updateContent={updateContent}
          uploadingAsset={uploadingAsset}
          handleBrandingUpload={handleBrandingUpload}
        />
      );
    }
    if (activeTab === 'studentPortal') {
      return (
        <StudentPortalSection
          content={content}
          setRecordedCoursesPublicVisibility={setRecordedCoursesPublicVisibility}
        />
      );
    }
    if (activeTab === 'batches') {
      return (
        <BatchesSection
          content={content}
          updateContent={updateContent}
          publishedBatchesList={publishedBatchesList}
          addFeaturedBatch={addFeaturedBatch}
          removeFeaturedBatch={removeFeaturedBatch}
          moveFeaturedBatch={moveFeaturedBatch}
        />
      );
    }
    if (activeTab === 'courses' || activeTab === 'coursesByCategory') {
      return (
        <CoursesSection
          content={content}
          updateContent={updateContent}
          activeSubTab={activeTab as 'courses' | 'coursesByCategory'}
          onSubTabChange={(tab) => setActiveTab(tab)}
          publishedCoursesList={publishedCoursesList}
          addFeaturedCourse={addFeaturedCourse}
          removeFeaturedCourse={removeFeaturedCourse}
          moveFeaturedCourse={moveFeaturedCourse}
        />
      );
    }
    if (activeTab === 'reviews') {
      return (
        <ReviewsSection
          reviews={reviews}
          filteredReviews={filteredReviews}
          reviewsLoading={reviewsLoading}
          reviewSearch={reviewSearch}
          setReviewSearch={setReviewSearch}
          displayedReviews={displayedReviews}
          hiddenReviews={hiddenReviews}
          sensors={sensors}
          toggleReviewDisplay={toggleReviewDisplay}
          updateReviewOrder={updateReviewOrder}
          setShowAddReviewModal={setShowAddReviewModal}
          showAddReviewModal={showAddReviewModal}
          showReviewModal={showReviewModal}
          setShowReviewModal={setShowReviewModal}
          selectedReview={selectedReview}
          setSelectedReview={setSelectedReview}
          creatingReview={creatingReview}
          handleCreateReview={handleCreateReview}
          newReview={newReview}
          setNewReview={setNewReview}
          reviewCourses={reviewCourses}
          resetNewReviewForm={resetNewReviewForm}
        />
      );
    }
    if (activeTab === 'navigation' || activeTab === 'buttons' || activeTab === 'mobile') {
      const navSubTab =
        activeTab === 'buttons' ? 'buttons' : 'navigation';
      return (
        <NavigationSection
          content={content}
          updateContent={updateContent}
          activeSubTab={navSubTab}
          onSubTabChange={(tab) => setActiveTab(tab)}
        />
      );
    }
    if (activeTab === 'partners') {
      return <PartnersSection content={content} updateContent={updateContent} />;
    }
    if (activeTab === 'footer') {
      return <FooterSection content={content} updateContent={updateContent} />;
    }
    return null;
  };

  
  const tabLabel = getCmsTabLabel(activeTab);

  if (isLoading) {
    return (
      <AdminRoleShell>
        <main className="relative z-10 p-2 sm:p-4">
          <WelcomeSection 
            title="Website Content Management"
            description="Manage header content, navigation, branding, and more"
          />
          <PageSection className="mb-2 sm:mb-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B2CBF] mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading website content...</p>
              </div>
            </div>
          </PageSection>
        </main>
      </AdminRoleShell>
    );
  }

  if (!content) {
    return (
      <AdminRoleShell>
        <main className="relative z-10 p-2 sm:p-4">
          <WelcomeSection 
            title="Website Content Management"
            description="Manage header content, navigation, branding, and more"
          />
          <PageSection className="mb-2 sm:mb-4">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Failed to load content</p>
                <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
              </div>
            </div>
          </PageSection>
        </main>
      </AdminRoleShell>
    );
  }

  return (
    <AdminRoleShell scroll={false}>
      <main className="relative z-10 flex min-h-0 flex-1 flex-col p-2 sm:p-4 md:min-h-[calc(100svh-5rem)]">
        {/* Welcome Section */}
        <div className="shrink-0">
        <WelcomeSection 
          title="Website Content Management"
          description="Manage header content, navigation, branding, and more"
        />
        {/* Save/Reset Actions */}
        <PageSection 
          title="Content Management"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="flex items-center gap-2 border-2 border-red-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200 font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 text-white transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="flex items-center gap-4">
            {saveStatus === 'success' && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="w-4 h-4 mr-1" />
                Saved successfully
              </Badge>
            )}
            {saveStatus === 'error' && (
              <Badge className="bg-red-500 text-white max-w-full whitespace-normal text-left">
                <X className="w-4 h-4 mr-1 shrink-0 inline" />
                {saveErrorMessage || 'Error saving'}
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Update website header content, navigation menus, branding, and contact information.
          </div>
        </PageSection>
        </div>
        <CmsSectionsLayout
          groups={CMS_SIDEBAR_GROUPS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <PageSection
            title={tabLabel}
            description={`Manage ${tabLabel.toLowerCase()} settings`}
            className="mb-0"
          >
            <div className="space-y-6">{renderActivePanel()}</div>
          </PageSection>
        </CmsSectionsLayout>

      </main>
    </AdminRoleShell>
  );
}

export default function WebsiteContentPage() {
  return (
    <AdminPageWrapper>
      <WebsiteContentPageContent />
    </AdminPageWrapper>
  );
}
