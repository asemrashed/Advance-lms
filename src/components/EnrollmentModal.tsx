import React, { useState, useEffect, useRef } from "react";
import FormModal from "@/components/ui/form-modal";
import { AttractiveInput } from "@/components/ui/attractive-input";
import { AttractiveTextarea } from "@/components/ui/attractive-textarea";
import {
  Enrollment,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
} from "@/types/enrollment";
import {
  LuUser as User,
  LuBookOpen as BookOpen,
  LuCalendar,
  LuPhone,
  LuMail,
} from "react-icons/lu";
import { TakaIcon } from "@/components/ui/TakaIcon";
import { MANUAL_ENROLL_STUDENT_PASSWORD } from "@/lib/adminPermissions";
import { resolveCourseFinalPrice } from "@/lib/courses/liveCoursePricing";

interface EnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enrollment?: Enrollment | null;
  createEnrollment?: (data: CreateEnrollmentRequest) => Promise<Enrollment | null>;
  updateEnrollment?: (id: string, data: UpdateEnrollmentRequest) => Promise<Enrollment | null>;
}

function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  open,
  onClose,
  onSuccess,
  enrollment,
  createEnrollment,
  updateEnrollment,
}) => {
  const isEdit = Boolean(enrollment);
  const [studentMode, setStudentMode] = useState<"existing" | "new">("existing");
  const [formData, setFormData] = useState({
    student: "",
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    course: "",
    paymentStatus: "pending" as "pending" | "paid" | "failed",
    paymentAmount: "",
    paymentMethod: "cash",
    billingPlan: "full" as "monthly" | "full",
    paymentDueAt: "",
    notes: "",
  });

  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchStudents();
      fetchCourses();
    }
  }, [open]);

  useEffect(() => {
    if (enrollment) {
      setStudentMode("existing");
      setFormData({
        student: enrollment.student,
        studentName: "",
        studentEmail: "",
        studentPhone: "",
        course: enrollment.course,
        paymentStatus: enrollment.paymentStatus,
        paymentAmount: enrollment.paymentAmount?.toString() || "",
        paymentMethod: enrollment.paymentMethod || "cash",
        billingPlan: enrollment.billingPlan || "full",
        paymentDueAt: toDateInput(enrollment.paymentDueAt),
        notes: enrollment.notes || "",
      });
      if (enrollment.studentInfo?.name) setStudentSearch(enrollment.studentInfo.name);
      if (enrollment.courseInfo?.title) setCourseSearch(enrollment.courseInfo.title);
    } else {
      setStudentMode("existing");
      setFormData({
        student: "",
        studentName: "",
        studentEmail: "",
        studentPhone: "",
        course: "",
        paymentStatus: "pending",
        paymentAmount: "",
        paymentMethod: "cash",
        billingPlan: "full",
        paymentDueAt: "",
        notes: "",
      });
      setStudentSearch("");
      setCourseSearch("");
    }
    setErrors({});
  }, [enrollment, open]);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/users?role=student");
      const data = await response.json();
      if (response.ok) {
        setStudents(data.users || []);
        setFilteredStudents(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      const data = await response.json();
      if (response.ok) {
        setCourses(data.data?.courses || []);
        setFilteredCourses(data.data?.courses || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleStudentSearch = (searchTerm: string) => {
    setStudentSearch(searchTerm);
    if (searchTerm.trim() === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        (student) =>
          student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredStudents(filtered);
    }
  };

  const handleCourseSearch = (searchTerm: string) => {
    setCourseSearch(searchTerm);
    if (searchTerm.trim() === "") {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.category?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredCourses(filtered);
    }
  };

  const handleStudentSelect = (student: any) => {
    setFormData((prev) => ({ ...prev, student: student._id }));
    setStudentSearch(student.name);
    setShowStudentDropdown(false);
  };

  const handleCourseSelect = (course: any) => {
    const listPrice = resolveCourseFinalPrice({
      isPaid: course.isPaid,
      price: course.price,
      salePrice: course.salePrice,
      monthlyPrice: course.monthlyPrice,
    });
    setFormData((prev) => ({
      ...prev,
      course: course._id,
      paymentAmount: prev.paymentAmount || (listPrice ? String(listPrice) : "0"),
      paymentStatus: course.isPaid ? prev.paymentStatus : "paid",
    }));
    setCourseSearch(course.title);
    setShowCourseDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false);
      }
      if (
        courseDropdownRef.current &&
        !courseDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCourseDropdown(false);
      }
    };

    if (showStudentDropdown || showCourseDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStudentDropdown, showCourseDropdown]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!isEdit) {
      if (studentMode === "existing" && !formData.student) {
        newErrors.student = "Student is required";
      }
      if (studentMode === "new") {
        if (!formData.studentName.trim()) newErrors.studentName = "Name is required";
        if (!formData.studentEmail.trim()) newErrors.studentEmail = "Email is required";
        if (!formData.studentPhone.trim()) newErrors.studentPhone = "Phone is required";
      }
    }

    if (!formData.course) {
      newErrors.course = "Course is required";
    }

    if (formData.paymentAmount && isNaN(Number(formData.paymentAmount))) {
      newErrors.paymentAmount = "Enroll price must be a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const paymentAmount = formData.paymentAmount
        ? Number(formData.paymentAmount)
        : undefined;
      const paymentDueAt = formData.paymentDueAt
        ? new Date(`${formData.paymentDueAt}T23:59:59`).toISOString()
        : null;

      if (enrollment && updateEnrollment) {
        await updateEnrollment(enrollment._id, {
          paymentStatus: formData.paymentStatus,
          paymentAmount,
          paymentMethod: formData.paymentMethod,
          billingPlan: formData.billingPlan,
          paymentDueAt,
          notes: formData.notes,
          lockPrice: true,
        });
      } else if (createEnrollment) {
        const payload: CreateEnrollmentRequest = {
          course: formData.course,
          paymentStatus: formData.paymentStatus,
          paymentAmount,
          paymentMethod: formData.paymentMethod,
          billingPlan: formData.billingPlan,
          paymentDueAt,
          notes: formData.notes,
          lockPrice: true,
        };
        if (studentMode === "new") {
          payload.newStudent = {
            name: formData.studentName.trim(),
            email: formData.studentEmail.trim(),
            phone: formData.studentPhone.trim(),
          };
        } else {
          payload.student = formData.student;
        }
        await createEnrollment(payload);
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving enrollment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={enrollment ? "Edit Enrollment" : "Add New Enrollment"}
      size="xl"
      formId="enrollment-form"
      submitText={enrollment ? "Update Enrollment" : "Create Enrollment"}
      loading={submitting}
    >
      <div className="space-y-6">
        {!isEdit ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStudentMode("existing")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                studentMode === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Registered student
            </button>
            <button
              type="button"
              onClick={() => setStudentMode("new")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                studentMode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              New student
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {isEdit || studentMode === "existing" ? (
            <div className="relative" ref={studentDropdownRef}>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Student *
              </label>
              <AttractiveInput
                value={studentSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleStudentSearch(e.target.value);
                  setShowStudentDropdown(true);
                }}
                onFocus={() => setShowStudentDropdown(true)}
                placeholder="Search students..."
                icon={<User className="h-5 w-5" />}
                disabled={isEdit}
                error={errors.student}
                colorScheme="primary"
                size="md"
              />
              {showStudentDropdown && !isEdit ? (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => handleStudentSelect(student)}
                        className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-100"
                      >
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-500">
                      No students found
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Name *
                </label>
                <AttractiveInput
                  value={formData.studentName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("studentName", e.target.value)
                  }
                  placeholder="Student full name"
                  icon={<User className="h-5 w-5" />}
                  error={errors.studentName}
                  colorScheme="primary"
                  size="md"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Email *
                </label>
                <AttractiveInput
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("studentEmail", e.target.value)
                  }
                  placeholder="student@email.com"
                  icon={<LuMail className="h-5 w-5" />}
                  error={errors.studentEmail}
                  colorScheme="primary"
                  size="md"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Phone *
                </label>
                <AttractiveInput
                  value={formData.studentPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("studentPhone", e.target.value)
                  }
                  placeholder="01XXXXXXXXX"
                  icon={<LuPhone className="h-5 w-5" />}
                  error={errors.studentPhone}
                  colorScheme="primary"
                  size="md"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  One-time login password
                </label>
                <AttractiveInput
                  value={MANUAL_ENROLL_STUDENT_PASSWORD}
                  disabled
                  colorScheme="primary"
                  size="md"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Share this password with the student. They can change it after signing in.
                </p>
              </div>
            </div>
          )}

          <div className="relative" ref={courseDropdownRef}>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Course *
            </label>
            <AttractiveInput
              value={courseSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                handleCourseSearch(e.target.value);
                setShowCourseDropdown(true);
              }}
              onFocus={() => setShowCourseDropdown(true)}
              placeholder="Search courses..."
              icon={<BookOpen className="h-5 w-5" />}
              disabled={isEdit}
              error={errors.course}
              colorScheme="primary"
              size="md"
            />
            {showCourseDropdown && !isEdit ? (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <button
                      key={course._id}
                      type="button"
                      onClick={() => handleCourseSelect(course)}
                      className="w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-100"
                    >
                      <div className="font-medium text-gray-900">{course.title}</div>
                      {course.category ? (
                        <div className="text-sm text-gray-500">{course.category}</div>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center text-gray-500">
                    No courses found
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="border-b border-border pb-2 text-lg font-semibold text-foreground">
            Payment
          </h3>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Payment status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => handleInputChange("paymentStatus", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Fixed enroll price
              </label>
              <AttractiveInput
                type="number"
                step="0.01"
                min="0"
                value={formData.paymentAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("paymentAmount", e.target.value)
                }
                placeholder="0.00"
                icon={<TakaIcon className="h-5 w-5" />}
                error={errors.paymentAmount}
                colorScheme="primary"
                size="md"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This price is locked for this student on later payments.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Payment method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground"
              >
                <option value="cash">Cash / offline</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Dues date
              </label>
              <AttractiveInput
                type="date"
                value={formData.paymentDueAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("paymentDueAt", e.target.value)
                }
                icon={<LuCalendar className="h-5 w-5" />}
                colorScheme="primary"
                size="md"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Notes</label>
          <AttractiveTextarea
            value={formData.notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              handleInputChange("notes", e.target.value)
            }
            placeholder="Additional notes about this enrollment..."
            colorScheme="primary"
            size="md"
            rows={3}
          />
        </div>
      </div>
    </FormModal>
  );
};

export default EnrollmentModal;
