'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import {
  InstructorPage,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageSourceField } from '@/components/ui/ImageSourceField';
import TipTapEditor from '@/components/ui/TipTapEditor';
import { CourseBatchesPanel } from '@/components/courses/CourseBatchesPanel';
import {
  WeeklyScheduleFields,
  addMinutesToTime,
  formatScheduleLabel,
  minutesBetween,
  type DayScheduleEntry,
} from '@/components/courses/WeeklyScheduleFields';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useSubjects } from '@/hooks/useSubjects';
import { BATCH_GRADES, normalizeBatchGrade } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import { formatBdt } from '@/lib/currency';
import { resolveImageSrc } from '@/lib/resolveImageSrc';
import { coursesStaffService } from '@/services/coursesStaffService';
import { batchesService } from '@/services/batchesService';
import { faqAdminService } from '@/services/faqAdminService';
import type { Course } from '@/types/course';
import { cn } from '@/lib/cn';
import { showSuccess } from '@/lib/swal';
import {
  LuArrowLeft,
  LuArrowRight,
  LuBookOpen,
  LuCalendarClock,
  LuCheck,
  LuCircleHelp,
  LuLoader,
  LuPlus,
  LuTrash2,
} from 'react-icons/lu';

type StepId = 1 | 2 | 3 | 4 | 5;

type FaqPair = { _id?: string; question: string; answer: string };

function plainText(html: string) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type StaffRole = 'admin' | 'instructor';

type InstructorCreateCourseFlowProps = {
  mode?: 'create' | 'edit';
  initialCourseId?: string;
  role?: StaffRole;
};

export function InstructorCreateCourseFlow({
  mode = 'create',
  initialCourseId,
  role = 'instructor',
}: InstructorCreateCourseFlowProps = {}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const isAdmin = role === 'admin';
  const coursesHref = isAdmin ? '/admin/courses' : '/instructor/courses';
  const materialsBase = isAdmin ? '/admin/materials' : '/instructor/materials';
  const courseEditHref = (id: string) =>
    isAdmin ? `/admin/courses/${id}/edit` : `/instructor/courses/${id}/edit`;
  const RoleShell = isAdmin ? AdminRoleShell : InstructorRoleShell;
  const { subjects, loading: subjectsLoading } = useSubjects({
    limit: 200,
    isActive: true,
    sortBy: 'name',
  });

  const [step, setStep] = useState<StepId>(1);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const [courseTypeLocked, setCourseTypeLocked] = useState(false);
  const [courseStatus, setCourseStatus] = useState<Course['status']>('draft');
  const [hasPriorApproval, setHasPriorApproval] = useState(false);

  const [courseId, setCourseId] = useState<string | null>(initialCourseId || null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: '',
    subjectId: '',
    grade: '',
    description: '',
    courseType: 'live' as 'live' | 'recorded',
    isPaid: true,
    price: '',
    monthlyPrice: '',
    thumbnailUrl: '',
  });

  const [batchForm, setBatchForm] = useState({
    name: '',
    maxStudents: '30',
    startDate: '',
    endDate: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    days: [] as DayScheduleEntry[],
    topic: 'Weekly class',
    meetLink: '',
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [faqPairs, setFaqPairs] = useState<FaqPair[]>([
    { question: '', answer: '' },
  ]);
  const [knownFaqIds, setKnownFaqIds] = useState<string[]>([]);
  const [faqsLoaded, setFaqsLoaded] = useState(false);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s._id === courseForm.subjectId),
    [subjects, courseForm.subjectId],
  );
  const filteredSubjects = useMemo(
    () =>
      courseForm.grade
        ? subjects.filter(
            (subject) => normalizeBatchGrade(subject.grade) === courseForm.grade,
          )
        : [],
    [courseForm.grade, subjects],
  );

  const isLive = courseForm.courseType === 'live';

  const stepMeta: { id: StepId; label: string; sub: string }[] = [
    { id: 1, label: 'Course Details', sub: 'Name, subject, price' },
    { id: 2, label: 'Create Batch', sub: 'Batch name & capacity' },
    { id: 3, label: 'Set Schedule', sub: 'Days & time' },
    { id: 4, label: 'Course FAQ', sub: 'Questions & answers' },
    { id: 5, label: 'Review & Publish', sub: 'Confirm & go live' },
  ];

  useEffect(() => {
    void (async () => {
      try {
        const res = await coursesStaffService.listCourses(
          'limit=8&sortBy=updatedAt&sortOrder=desc',
        );
        const data = await res.json();
        setExistingCourses((data?.data?.courses as Course[]) || []);
      } catch {
        setExistingCourses([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit || !initialCourseId) return;
    void (async () => {
      setLoadingCourse(true);
      setError(null);
      try {
        const res = await fetch(`/api/courses/${initialCourseId}`);
        const data = await res.json();
        if (!res.ok || !data?.data) {
          setError(data?.error || 'Failed to load course');
          return;
        }
        const course = data.data as Course;
        setCourseId(course._id);
        setCourseStatus(course.status);
        setHasPriorApproval(Boolean(course.hasPriorApproval));
        setCourseForm({
          title: course.title || '',
          subjectId: course.subjectId || '',
          grade: course.grade || '',
          description: course.description || course.shortDescription || '',
          courseType: (course.courseType || 'recorded') as 'live' | 'recorded',
          isPaid: Boolean(course.isPaid),
          price: course.price != null ? String(course.price) : '',
          monthlyPrice: course.monthlyPrice != null ? String(course.monthlyPrice) : '',
          thumbnailUrl: course.thumbnailUrl || '',
        });

        const [batchesRes, chaptersRes, faqsRes] = await Promise.all([
          coursesStaffService.listCourseBatches(course._id),
          fetch(`/api/chapters?course=${encodeURIComponent(course._id)}&limit=1`),
          faqAdminService.listFaqsForCourse(course._id),
        ]);
        const batchesData = await batchesRes.json();
        const batches = (batchesData?.data?.batches as { _id: string }[]) || [];
        const chaptersData = await chaptersRes.json();
        const chapterCount = Number(chaptersData?.data?.pagination?.total || 0);
        if (batches.length > 0 || chapterCount > 0) {
          setCourseTypeLocked(true);
        }
        if (batches[0]?._id) {
          setBatchId(batches[0]._id);
          setSelectedBatchId(batches[0]._id);
        }
        const faqsData = await faqsRes.json();
        const loadedFaqs = (faqsData?.data?.faqs as FaqPair[] | undefined) || [];
        setFaqPairs(
          loadedFaqs.length > 0
            ? loadedFaqs.map((f) => ({
                _id: f._id,
                question: f.question || '',
                answer: f.answer || '',
              }))
            : [{ question: '', answer: '' }],
        );
        setKnownFaqIds(
          loadedFaqs.map((f) => f._id).filter((id): id is string => Boolean(id)),
        );
        setFaqsLoaded(true);
      } catch {
        setError('Failed to load course');
      } finally {
        setLoadingCourse(false);
      }
    })();
  }, [isEdit, initialCourseId]);

  useEffect(() => {
    if (isEdit || !courseId || faqsLoaded) return;
    void (async () => {
      try {
        const res = await faqAdminService.listFaqsForCourse(courseId);
        const data = await res.json();
        if (!res.ok) return;
        const loadedFaqs = (data?.data?.faqs as FaqPair[] | undefined) || [];
        if (loadedFaqs.length > 0) {
          setFaqPairs(
            loadedFaqs.map((f) => ({
              _id: f._id,
              question: f.question || '',
              answer: f.answer || '',
            })),
          );
          setKnownFaqIds(
            loadedFaqs.map((f) => f._id).filter((id): id is string => Boolean(id)),
          );
        }
        setFaqsLoaded(true);
      } catch {
        /* optional preload */
      }
    })();
  }, [isEdit, courseId, faqsLoaded]);

  const validateStep1 = () => {
    if (!courseForm.title.trim()) return 'Course name is required';
    if (!courseForm.grade.trim()) return 'Grade is required';
    if (!courseForm.subjectId) return 'Subject is required';
    if (courseForm.isPaid && (!Number(courseForm.price) || Number(courseForm.price) <= 0)) {
      return 'Enter a valid fee for paid courses';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!batchForm.name.trim()) return 'Batch name is required';
    if (!batchForm.startDate || !batchForm.endDate) return 'Start and end dates are required';
    if (
      new Date(batchForm.startDate).getTime() >
      new Date(batchForm.endDate).getTime()
    ) {
      return 'Start date must be on or before end date';
    }
    if (Number(batchForm.maxStudents) <= 0) return 'Max students must be greater than 0';
    return null;
  };

  const validateStep3 = () => {
    if (scheduleForm.days.length === 0) return 'Select at least one class day';
    if (scheduleForm.days.some((d) => !d.startTime)) {
      return 'Each selected day needs a start time';
    }
    return null;
  };

  const saveCourse = async (opts?: { skipSavingState?: boolean }) => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return false;
    }
    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    try {
      const payload = {
        title: courseForm.title.trim(),
        courseType: courseForm.courseType,
        shortDescription: plainText(courseForm.description).slice(0, 280),
        description: courseForm.description,
        subjectId: courseForm.subjectId,
        subjectCode: selectedSubject?.code,
        subjectName: selectedSubject?.name,
        grade: isLive ? courseForm.grade : undefined,
        isPaid: courseForm.isPaid,
        status: 'draft' as const,
        price: courseForm.isPaid ? Number(courseForm.price) : undefined,
        monthlyPrice:
          courseForm.isPaid && courseForm.monthlyPrice && Number(courseForm.monthlyPrice) > 0
            ? Number(courseForm.monthlyPrice)
            : courseId
              ? null
              : undefined,
        thumbnailUrl: courseForm.thumbnailUrl.trim() || undefined,
      };

      if (courseId) {
        const res = await coursesStaffService.updateCourse(courseId, payload);
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to update course');
          return false;
        }
        if (data?.data) {
          setCourseStatus((data.data as Course).status);
          setHasPriorApproval(Boolean((data.data as Course).hasPriorApproval));
        }
      } else {
        const res = await coursesStaffService.createCourse(payload);
        const data = await res.json();
        if (!res.ok || !data?.data?._id) {
          setError(data?.error || 'Failed to create course');
          return false;
        }
        setCourseId(data.data._id as string);
        setCourseStatus((data.data as Course).status || 'draft');
      }
      return true;
    } catch {
      setError('Something went wrong. Please try again.');
      return false;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  const saveBatch = async () => {
    if (!courseId) {
      setError('Save the course first');
      return false;
    }
    const err = validateStep2();
    if (err) {
      setError(err);
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      if (batchId) {
        const res = await batchesService.updateBatch(batchId, {
          name: batchForm.name.trim(),
          startDate: batchForm.startDate,
          endDate: batchForm.endDate,
          maxStudents: Number(batchForm.maxStudents) || 30,
          fee: 0,
          isActive: true,
        });
        if (!res.success) {
          setError(res.error || 'Failed to update batch');
          return false;
        }
      } else {
        const res = await batchesService.createBatch({
          courseId,
          name: batchForm.name.trim(),
          startDate: batchForm.startDate,
          endDate: batchForm.endDate,
          maxStudents: Number(batchForm.maxStudents) || 30,
          fee: 0,
          shortDescription: batchForm.name.trim(),
          schedule: [],
        });
        if (!res.success || !res.data?.batch?._id) {
          setError(res.error || 'Failed to create batch');
          return false;
        }
        setBatchId(res.data.batch._id);
        setSelectedBatchId(res.data.batch._id);
      }
      return true;
    } catch {
      setError('Failed to save batch');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const syncScheduleForBatch = async (
    targetBatchId: string,
    opts?: { skipSavingState?: boolean },
  ) => {
    const err = validateStep3();
    if (err) {
      setError(err);
      return false;
    }
    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    try {
      const listed = await batchesService.listRoutineSlots(targetBatchId);
      if (!listed.success) {
        setError(listed.error || 'Failed to load existing schedule');
        return false;
      }
      const existing = listed.data?.slots || [];
      const topic = scheduleForm.topic.trim() || 'Weekly class';
      const meetRes = await batchesService.updateBatch(targetBatchId, {
        meetLink: scheduleForm.meetLink.trim(),
      });
      if (!meetRes.success) {
        setError(meetRes.error || 'Failed to save Google Meet link');
        return false;
      }

      for (const day of scheduleForm.days) {
        const endTime = addMinutesToTime(day.startTime, day.durationMinutes);
        const match =
          existing.find((s) => s._id === day.slotId) ||
          existing.find((s) => s.dayOfWeek === day.dayOfWeek);
        if (match) {
          const res = await batchesService.updateRoutineSlot(
            targetBatchId,
            match._id,
            {
              dayOfWeek: day.dayOfWeek,
              startTime: day.startTime,
              endTime,
              topic,
            },
          );
          if (!res.success) {
            setError(res.error || 'Failed to update schedule slot');
            return false;
          }
        } else {
          const res = await batchesService.createRoutineSlot(targetBatchId, {
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime,
            topic,
          });
          if (!res.success) {
            setError(res.error || 'Failed to create schedule slot');
            return false;
          }
        }
      }

      for (const slot of existing) {
        const stillSelected = scheduleForm.days.some(
          (d) => d.dayOfWeek === slot.dayOfWeek || d.slotId === slot._id,
        );
        if (!stillSelected) {
          const res = await batchesService.deleteRoutineSlot(
            targetBatchId,
            slot._id,
          );
          if (!res.success) {
            setError(res.error || 'Failed to remove schedule slot');
            return false;
          }
        }
      }

      // Reload to pick up slot ids
      const refreshed = await batchesService.listRoutineSlots(targetBatchId);
      if (refreshed.success && refreshed.data?.slots) {
        setScheduleForm((f) => ({
          ...f,
          days: refreshed.data!.slots
            .filter((s) => s.status !== 'inactive')
            .map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              durationMinutes: minutesBetween(s.startTime, s.endTime),
              slotId: s._id,
            }))
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
          topic:
            refreshed.data!.slots[0]?.topic?.trim() ||
            f.topic ||
            'Weekly class',
        }));
      }

      setScheduleSaved(true);
      return true;
    } catch {
      setError('Failed to save schedule');
      return false;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  const saveSchedule = async () => {
    const targetBatchId = batchId || selectedBatchId;
    if (!targetBatchId) {
      setError('Save the batch first');
      return false;
    }
    if (!isEdit && scheduleSaved) {
      return true;
    }
    return syncScheduleForBatch(targetBatchId);
  };

  const loadScheduleForBatch = async (targetBatchId: string) => {
    setScheduleLoading(true);
    try {
      const [listed, batchRes] = await Promise.all([
        batchesService.listRoutineSlots(targetBatchId),
        batchesService.getBatch(targetBatchId),
      ]);
      if (!listed.success || !listed.data?.slots) {
        setScheduleForm((f) => ({
          ...f,
          days: [],
          meetLink: batchRes.data?.batch.meetLink || f.meetLink,
        }));
        return;
      }
      const active = listed.data.slots.filter((s) => s.status !== 'inactive');
      setScheduleForm((f) => ({
        ...f,
        days: active
          .map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            durationMinutes: minutesBetween(s.startTime, s.endTime),
            slotId: s._id,
          }))
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
        topic: active[0]?.topic?.trim() || f.topic || 'Weekly class',
        meetLink: batchRes.data?.batch.meetLink || f.meetLink,
      }));
      setScheduleSaved(active.length > 0);
    } catch {
      setScheduleForm((f) => ({ ...f, days: [] }));
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (!isEdit || !isLive) return;
    const targetBatchId = selectedBatchId || batchId;
    if (!targetBatchId) {
      setScheduleForm((f) => ({ ...f, days: [] }));
      return;
    }
    void loadScheduleForBatch(targetBatchId);
    // Intentionally only reload when the selected batch changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, isLive, selectedBatchId, batchId]);

  const validateFaqs = () => {
    const hasPartial = faqPairs.some(
      (p) =>
        (p.question.trim() && !p.answer.trim()) ||
        (!p.question.trim() && p.answer.trim()),
    );
    if (hasPartial) return 'Each FAQ needs both a question and an answer';
    return null;
  };

  const saveFaqs = async (opts?: { skipSavingState?: boolean }) => {
    if (!courseId) {
      setError('Save the course first');
      return false;
    }
    const err = validateFaqs();
    if (err) {
      setError(err);
      return false;
    }

    const validPairs = faqPairs.filter(
      (p) => p.question.trim() && p.answer.trim(),
    );
    const keptIds = new Set(
      validPairs.map((p) => p._id).filter((id): id is string => Boolean(id)),
    );
    const toDelete = knownFaqIds.filter((id) => !keptIds.has(id));

    if (!opts?.skipSavingState) setSaving(true);
    setError(null);
    try {
      for (const id of toDelete) {
        const res = await faqAdminService.deleteFaq(id);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || 'Failed to remove an FAQ');
          return false;
        }
      }

      const toUpdate = validPairs.filter(
        (p): p is FaqPair & { _id: string } => Boolean(p._id),
      );
      const toCreate = validPairs.filter((p) => !p._id);

      for (const p of toUpdate) {
        const res = await faqAdminService.updateFaq(
          p._id,
          {
            course: courseId,
            question: p.question.trim(),
            answer: p.answer.trim(),
          },
          'PATCH',
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || 'Failed to update FAQ');
          return false;
        }
      }

      let createdFaqs: FaqPair[] = [];
      if (toCreate.length > 0) {
        const createRes = await faqAdminService.bulkCreateFaqs({
          course: courseId,
          faqs: toCreate.map((p) => ({
            question: p.question.trim(),
            answer: p.answer.trim(),
          })),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.success) {
          setError(createData?.error || 'Failed to create FAQs');
          return false;
        }
        createdFaqs = ((createData?.data?.faqs as FaqPair[]) || []).map((f) => ({
          _id: f._id,
          question: f.question,
          answer: f.answer,
        }));
      }

      const updatedPairs: FaqPair[] = [
        ...toUpdate.map((p) => ({
          _id: p._id,
          question: p.question.trim(),
          answer: p.answer.trim(),
        })),
        ...createdFaqs,
      ];

      setFaqPairs(
        updatedPairs.length > 0 ? updatedPairs : [{ question: '', answer: '' }],
      );
      setKnownFaqIds(
        updatedPairs.map((p) => p._id).filter((id): id is string => Boolean(id)),
      );
      setFaqsLoaded(true);
      return true;
    } catch {
      setError('Failed to save FAQs');
      return false;
    } finally {
      if (!opts?.skipSavingState) setSaving(false);
    }
  };

  const saveAllEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      const courseOk = await saveCourse({ skipSavingState: true });
      if (!courseOk) return false;
      const faqOk = await saveFaqs({ skipSavingState: true });
      if (!faqOk) return false;
      if (isLive && (selectedBatchId || batchId) && scheduleForm.days.length > 0) {
        const scheduleOk = await syncScheduleForBatch(
          selectedBatchId || batchId || '',
          { skipSavingState: true },
        );
        if (!scheduleOk) return false;
      }
      showSuccess('Saved');
      return true;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      const ok = await saveCourse();
      if (!ok) return;
      if (isEdit) return;
      if (!isLive) {
        setStep(4);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await saveBatch();
      if (!ok) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      const ok = await saveSchedule();
      if (!ok) return;
      setStep(4);
      return;
    }
    if (step === 4) {
      const ok = await saveFaqs();
      if (!ok) return;
      setStep(5);
    }
  };

  const submitForApproval = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveCourse({ skipSavingState: true });
      if (!saved) return;
      if (isEdit) {
        const faqsOk = await saveFaqs({ skipSavingState: true });
        if (!faqsOk) return;
      }
      // Prefer state; saveCourse may have just created the course on first create.
      const id = courseId;
      if (!id) {
        setError('Course not found. Save the course first.');
        return;
      }
      const publishing = hasPriorApproval;
      const res = await coursesStaffService.updateCourse(id, {
        status: 'published',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data?.error ||
            (publishing ? 'Failed to publish course' : 'Failed to submit for approval'),
        );
        return;
      }
      if (data?.data) {
        setCourseStatus((data.data as Course).status);
        setHasPriorApproval(Boolean((data.data as Course).hasPriorApproval));
      }
      showSuccess(publishing ? 'Published' : 'Submitted for approval');
      router.push(
        `${materialsBase}?tab=${isLive ? 'live' : 'recorded'}&courseId=${id}`,
      );
    } catch {
      setError(hasPriorApproval ? 'Failed to publish course' : 'Failed to submit for approval');
    } finally {
      setSaving(false);
    }
  };

  const continueToMaterials = () => {
    if (!courseId) return;
    const params = new URLSearchParams({
      courseId,
      tab: isLive ? 'live' : 'recorded',
    });
    if (batchId || selectedBatchId) {
      params.set('batchId', batchId || selectedBatchId || '');
    }
    router.push(`${materialsBase}?${params.toString()}`);
  };

  const deleteCourse = async () => {
    if (!courseId) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const response = await coursesStaffService.deleteCourse(courseId);
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete course');
        return;
      }
      router.push(coursesHref);
      router.refresh();
    } catch {
      setError('Failed to delete course');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setScheduleSaved(false);
    setScheduleForm((f) => {
      const exists = f.days.some((d) => d.dayOfWeek === day);
      if (exists) {
        return { ...f, days: f.days.filter((d) => d.dayOfWeek !== day) };
      }
      return {
        ...f,
        days: [
          ...f.days,
          { dayOfWeek: day, startTime: '17:00', durationMinutes: 60 },
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      };
    });
  };

  const updateDaySchedule = (
    dayOfWeek: number,
    patch: Partial<Pick<DayScheduleEntry, 'startTime' | 'durationMinutes'>>,
  ) => {
    setScheduleSaved(false);
    setScheduleForm((f) => ({
      ...f,
      days: f.days.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d,
      ),
    }));
  };

  const addFaqPair = () => {
    setFaqPairs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const removeFaqPair = (index: number) => {
    setFaqPairs((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ question: '', answer: '' }],
    );
  };

  const updateFaqPair = (
    index: number,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setFaqPairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
    );
  };

  const filledFaqCount = faqPairs.filter(
    (p) => p.question.trim() && p.answer.trim(),
  ).length;

  const priceLabel = courseForm.isPaid
    ? formatBdt(Number(courseForm.price) || 0)
    : 'Free';

  const scheduleLabel = formatScheduleLabel(scheduleForm.days);

  const publishLabel =
    courseStatus === 'pending_approval'
      ? 'Awaiting admin approval'
      : hasPriorApproval
        ? 'Publish'
        : 'Submit for approval';

  const renderEditActions = () => (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={coursesHref}>Cancel</Link>
        </Button>
        {courseId ? (
          <Button variant="outline" size="sm" onClick={continueToMaterials}>
            Manage Curriculum
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={saving || !courseId}
          onClick={() => void saveAllEdit()}
        >
          {saving ? <LuLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        <Button
          size="sm"
          disabled={saving || !courseId || courseStatus === 'pending_approval'}
          onClick={() => void submitForApproval()}
        >
          {saving ? <LuLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
          {publishLabel}
        </Button>
      </div>
    </div>
  );

  const renderFaqFields = () => (
    <div className="space-y-4">
      {faqPairs.map((pair, index) => (
        <div
          key={pair._id || `faq-${index}`}
          className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              FAQ {index + 1}
            </span>
            {faqPairs.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => removeFaqPair(index)}
              >
                <LuTrash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Question</Label>
            <Input
              value={pair.question}
              maxLength={500}
              onChange={(e) => updateFaqPair(index, 'question', e.target.value)}
              placeholder="e.g. How long is each live class?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Answer</Label>
            <textarea
              className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={pair.answer}
              maxLength={5000}
              rows={3}
              onChange={(e) => updateFaqPair(index, 'answer', e.target.value)}
              placeholder="Write a clear answer for students"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addFaqPair} className="gap-2">
        <LuPlus className="h-4 w-4" />
        Add another Q&amp;A
      </Button>
      <p className="text-xs text-muted-foreground">
        FAQs are optional. Leave blank to skip, or add questions students often ask.
      </p>
    </div>
  );

  return (
    <RoleShell>
      <InstructorPage className="space-y-6">
        <InstructorTopbar
          title={isEdit ? 'Edit Course' : 'Create Course'}
          subtitle={
            isEdit
              ? `${isAdmin ? 'Courses' : 'My Courses'} → Edit Course`
              : `${isAdmin ? 'Courses' : 'My Courses'} → New Course`
          }
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={coursesHref}>
                <LuArrowLeft className="mr-1 h-4 w-4" />
                Back to courses
              </Link>
            </Button>
          }
        />

        {loadingCourse ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LuLoader className="h-5 w-5 animate-spin" />
            Loading course…
          </div>
        ) : (
        <>

        {isEdit ? renderEditActions() : null}

        {!isEdit ? (
        /* Stepper */
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 sm:gap-0 sm:px-6">
          {stepMeta.map((s, i) => {
            const done =
              step > s.id || (!isLive && s.id >= 2 && s.id <= 3 && step >= 4);
            const active = step === s.id;
            const skipped = !isLive && (s.id === 2 || s.id === 3);
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-3',
                    skipped && 'opacity-40',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      done && 'bg-primary text-primary-foreground',
                      active && !done && 'bg-foreground text-background',
                      !active && !done && 'border border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? <LuCheck className="h-4 w-4" /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={cn(
                        'text-sm font-semibold',
                        !active && !done && 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.sub}</div>
                  </div>
                </div>
                {i < stepMeta.length - 1 && (
                  <div
                    className={cn(
                      'mx-3 hidden h-0.5 w-8 sm:block md:w-10',
                      done ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {(step === 1 || isEdit) && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
                  <LuBookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold">
                      {isEdit ? 'Course Details' : 'Step 1 — Course Details'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Basic information about this course
                    </p>
                  </div>
                </header>
                <div className="space-y-4 p-5">
                  <div className="space-y-1.5">
                    <Label>
                      Course Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={courseForm.title}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="e.g. Add Math — Full Syllabus"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Course Type</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={courseForm.courseType}
                        disabled={courseTypeLocked || isEdit}
                        onChange={(e) =>
                          setCourseForm((f) => ({
                            ...f,
                            courseType: e.target.value as 'live' | 'recorded',
                          }))
                        }
                      >
                        <option value="live">Live — with batches & schedule</option>
                        <option value="recorded">Recorded — self-paced</option>
                      </select>
                      {(courseTypeLocked || isEdit) && (
                        <p className="text-xs text-muted-foreground">
                          Course type is locked once curriculum or batches exist.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Grade Level <span className="text-destructive">*</span>
                      </Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={courseForm.grade}
                        onChange={(e) => {
                          const grade = e.target.value;
                          setCourseForm((f) => ({
                            ...f,
                            grade,
                            subjectId: '',
                          }));
                        }}
                      >
                        <option value="">Select grade first</option>
                        {BATCH_GRADES.map((g) => (
                          <option key={g} value={g}>
                            {formatGradeLabel(g)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={courseForm.subjectId}
                      disabled={subjectsLoading || !courseForm.grade}
                      onChange={(e) =>
                        setCourseForm((f) => ({ ...f, subjectId: e.target.value }))
                      }
                    >
                      <option value="">
                        {courseForm.grade
                          ? 'Select subject'
                          : 'Select grade first'}
                      </option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name}
                          {subject.code ? ` (${subject.code})` : ''}
                        </option>
                      ))}
                    </select>
                    {courseForm.grade &&
                    !subjectsLoading &&
                    filteredSubjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No subjects are configured for this grade.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Course Description</Label>
                    <TipTapEditor
                      value={courseForm.description}
                      onChange={(value) =>
                        setCourseForm((f) => ({ ...f, description: value }))
                      }
                      placeholder="Full course description shown to students"
                    />
                  </div>
                  <ImageSourceField
                    label="Course thumbnail"
                    hint="Recommended size: 1280 × 720 px (16:9). Upload an image file or paste an external image URL."
                    value={courseForm.thumbnailUrl}
                    onChange={(url) =>
                      setCourseForm((f) => ({ ...f, thumbnailUrl: url }))
                    }
                  />
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Pricing</Label>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="isPaid"
                          checked={courseForm.isPaid}
                          onCheckedChange={(c) =>
                            setCourseForm((f) => ({ ...f, isPaid: Boolean(c) }))
                          }
                        />
                        <Label htmlFor="isPaid" className="font-normal">
                          Paid course
                        </Label>
                      </div>
                    </div>
                    {courseForm.isPaid && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>
                            Full Fee (৳) <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={courseForm.price}
                            onChange={(e) =>
                              setCourseForm((f) => ({ ...f, price: e.target.value }))
                            }
                            placeholder="4500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Monthly Fee (৳) (Optional)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={courseForm.monthlyPrice}
                            onChange={(e) =>
                              setCourseForm((f) => ({ ...f, monthlyPrice: e.target.value }))
                            }
                            placeholder="e.g. 500"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Enables monthly payment option for students at checkout.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                  {isEdit ? (
                    <Button variant="outline" asChild>
                      <Link href={coursesHref}>Cancel</Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link href={coursesHref}>Cancel</Link>
                      </Button>
                      <Button disabled={saving} onClick={() => void goNext()}>
                        {saving ? (
                          <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save & Continue
                        <LuArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </>
                  )}
                </footer>
              </section>
            )}

            {isEdit && isLive && courseId ? (
              <CourseBatchesPanel
                courseId={courseId}
                role={role}
                selectedBatchId={selectedBatchId}
                onSelectBatch={setSelectedBatchId}
                onOpenOperations={(id) => {
                  router.push(
                    `${materialsBase}?tab=live&courseId=${courseId}&batchId=${id}`,
                  );
                }}
              />
            ) : null}

            {isEdit && isLive && courseId ? (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
                  <LuCalendarClock className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">Weekly Schedule</h2>
                    <p className="text-xs text-muted-foreground">
                      Set a separate start time for each class day on the selected
                      batch
                    </p>
                  </div>
                </header>
                <div className="space-y-4 p-5">
                  {!selectedBatchId && !batchId ? (
                    <p className="text-sm text-muted-foreground">
                      Create or select a batch above to edit its weekly schedule.
                    </p>
                  ) : scheduleLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LuLoader className="h-4 w-4 animate-spin" />
                      Loading schedule…
                    </div>
                  ) : (
                    <WeeklyScheduleFields
                      days={scheduleForm.days}
                      topic={scheduleForm.topic}
                      meetLink={scheduleForm.meetLink}
                      onToggleDay={toggleDay}
                      onUpdateDay={updateDaySchedule}
                      onTopicChange={(topic) => {
                        setScheduleSaved(false);
                        setScheduleForm((f) => ({ ...f, topic }));
                      }}
                      onMeetLinkChange={(meetLink) =>
                        setScheduleForm((f) => ({ ...f, meetLink }))
                      }
                    />
                  )}
                </div>
                {(selectedBatchId || batchId) && !scheduleLoading ? (
                  <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
                    <Button
                      disabled={saving}
                      onClick={() =>
                        void (async () => {
                          const ok = await syncScheduleForBatch(
                            selectedBatchId || batchId || '',
                          );
                          if (ok) showSuccess('Schedule saved');
                        })()
                      }
                    >
                      {saving ? (
                        <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Save schedule
                    </Button>
                  </footer>
                ) : null}
              </section>
            ) : null}

            {isEdit && courseId ? (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
                  <LuCircleHelp className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold">Course FAQ</h2>
                    <p className="text-xs text-muted-foreground">
                      Questions students see on the course page
                    </p>
                  </div>
                </header>
                <div className="space-y-4 p-5">{renderFaqFields()}</div>
              </section>
            ) : null}

            {!isEdit && step === 2 && isLive && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="border-b border-border bg-muted/40 px-5 py-4">
                  <h2 className="text-sm font-semibold">Step 2 — Create Batch</h2>
                  <p className="text-xs text-muted-foreground">
                    A course can have multiple batches at different times
                  </p>
                </header>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>
                        Batch Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={batchForm.name}
                        onChange={(e) =>
                          setBatchForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Batch A — Morning"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Max Students <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={batchForm.maxStudents}
                        onChange={(e) =>
                          setBatchForm((f) => ({ ...f, maxStudents: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>
                        Start Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={batchForm.startDate}
                        onChange={(e) =>
                          setBatchForm((f) => ({ ...f, startDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        End Date <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={batchForm.endDate}
                        onChange={(e) =>
                          setBatchForm((f) => ({ ...f, endDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <footer className="flex justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button disabled={saving} onClick={() => void goNext()}>
                    {saving ? (
                      <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save & Continue
                    <LuArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </footer>
              </section>
            )}

            {!isEdit && step === 3 && isLive && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="border-b border-border bg-muted/40 px-5 py-4">
                  <h2 className="text-sm font-semibold">Step 3 — Set Weekly Schedule</h2>
                  <p className="text-xs text-muted-foreground">
                    This schedule repeats every week for this batch. Set a different
                    time per day if needed.
                  </p>
                </header>
                <div className="p-5">
                  <WeeklyScheduleFields
                    days={scheduleForm.days}
                    topic={scheduleForm.topic}
                    meetLink={scheduleForm.meetLink}
                    onToggleDay={toggleDay}
                    onUpdateDay={updateDaySchedule}
                    onTopicChange={(topic) => {
                      setScheduleSaved(false);
                      setScheduleForm((f) => ({ ...f, topic }));
                    }}
                    onMeetLinkChange={(meetLink) =>
                      setScheduleForm((f) => ({ ...f, meetLink }))
                    }
                  />
                </div>
                <footer className="flex justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    ← Back
                  </Button>
                  <Button disabled={saving} onClick={() => void goNext()}>
                    {saving ? (
                      <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save & Continue
                    <LuArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </footer>
              </section>
            )}

            {!isEdit && step === 4 && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
                  <LuCircleHelp className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold">Step 4 — Course FAQ</h2>
                    <p className="text-xs text-muted-foreground">
                      Add questions and answers students will see on the course page
                    </p>
                  </div>
                </header>
                <div className="space-y-4 p-5">{renderFaqFields()}</div>
                <footer className="flex justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(isLive ? 3 : 1)}
                  >
                    ← Back
                  </Button>
                  <Button disabled={saving} onClick={() => void goNext()}>
                    {saving ? (
                      <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save & Continue
                    <LuArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </footer>
              </section>
            )}

            {!isEdit && step === 5 && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="border-b border-border bg-muted/40 px-5 py-4">
                  <h2 className="text-sm font-semibold">Step 5 — Review & Publish</h2>
                  <p className="text-xs text-muted-foreground">
                    Check everything before submitting for approval
                  </p>
                </header>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Course
                    </div>
                    <div className="mt-1 text-sm font-semibold">{courseForm.title || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Batch
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {isLive ? batchForm.name || '—' : 'N/A (recorded)'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Schedule
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {isLive ? scheduleLabel : 'Self-paced'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      FAQ
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {filledFaqCount > 0
                        ? `${filledFaqCount} question${filledFaqCount === 1 ? '' : 's'}`
                        : 'None added'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fee
                    </div>
                    <div className="mt-1 text-sm font-semibold text-primary">{priceLabel}</div>
                  </div>
                </div>
                {isLive && courseId ? (
                  <div className="border-t border-border px-5 py-4">
                    <CourseBatchesPanel
                      courseId={courseId}
                      role={role}
                      selectedBatchId={selectedBatchId || batchId}
                      onSelectBatch={setSelectedBatchId}
                      onOpenOperations={(id) => {
                        router.push(
                          `${materialsBase}?tab=live&courseId=${courseId}&batchId=${id}`,
                        );
                      }}
                    />
                  </div>
                ) : null}
                <footer className="flex flex-wrap justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    ← Back
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={continueToMaterials}>
                      Curriculum Builder
                    </Button>
                    <Button disabled={saving} onClick={() => void submitForApproval()}>
                      {saving ? (
                        <LuLoader className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {hasPriorApproval ? 'Publish' : 'Submit for approval'}
                    </Button>
                  </div>
                </footer>
              </section>
            )}
          </div>

          {/* Right column */}
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Live preview</h3>
              </div>
              <div className="space-y-3 p-4">
                {courseForm.thumbnailUrl ? (
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageSrc(courseForm.thumbnailUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="font-serif text-xl font-bold tracking-tight">
                  {courseForm.title || 'Course title'}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {selectedSubject?.name || 'Subject'}
                  {courseForm.grade ? ` · ${courseForm.grade}` : ''}
                </div>
                <p className="text-sm text-muted-foreground">
                  {plainText(courseForm.description) || 'Description will appear here.'}
                </p>
                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{courseForm.courseType}</span>
                  </div>
                  {isLive && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch</span>
                        <span className="font-medium">{batchForm.name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seats</span>
                        <span className="font-medium">{batchForm.maxStudents || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-medium">{scheduleLabel}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="pt-2 font-serif text-2xl font-bold text-primary">
                  {priceLabel}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-2 text-sm font-semibold text-primary">Tips</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>✓ Pick the admin subject so its chapter catalog is available in Curriculum Builder</li>
                <li>✓ Live courses need at least one batch before students enroll</li>
                <li>✓ Add FAQs so students get quick answers on the course page</li>
                <li>
                  ✓ {hasPriorApproval
                    ? 'Publish whenever your approved course is ready'
                    : 'Submit for approval when curriculum basics are ready'}
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Your courses</h3>
                <Link
                  href={coursesHref}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <div>
                {existingCourses.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No courses yet
                  </p>
                ) : (
                  existingCourses.slice(0, 5).map((c) => (
                    <Link
                      key={c._id}
                      href={courseEditHref(c._id)}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm">
                        {c.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImageSrc(c.thumbnailUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          '📚'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {c.status?.replace('_', ' ')}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
        {isEdit ? renderEditActions() : null}
        {isEdit && courseId ? (
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
            <p className="mt-1 text-sm text-red-700">
              Permanently delete this course. This action cannot be undone.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-4"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <LuTrash2 className="mr-2 h-4 w-4" />
              Delete course
            </Button>
          </section>
        ) : null}
        <ConfirmModal
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => void deleteCourse()}
          title="Delete course"
          description={`Are you sure you want to delete "${courseForm.title || 'this course'}"? This action cannot be undone.`}
          confirmText="Delete course"
          variant="danger"
          loading={deleteLoading}
        />
        </>
        )}
      </InstructorPage>
    </RoleShell>
  );
}
