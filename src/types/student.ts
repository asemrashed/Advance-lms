export interface Student {
  _id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'student';
  isActive: boolean;
  avatar?: string;
  studentId?: string;
  enrollmentDate?: Date;
  grade?: string;
  parentPhone?: string;
  address?: {
    fullAddress?: string;
  };
  totalEnrolledAmount?: number;
  enrollmentCount?: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface StudentFormData {
  email: string;
  phone: string;
  name: string;
  isActive: boolean;
  avatar?: string;
  parentPhone?: string;
  address?: {
    fullAddress?: string;
  };
  password?: string;
}

export interface StudentUpdateData {
  email?: string;
  phone?: string;
  name?: string;
  isActive?: boolean;
  avatar?: string;
  studentId?: string;
  grade?: string;
  parentPhone?: string;
  address?: {
    fullAddress?: string;
  };
}

export interface StudentStatsSummary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalEnrolledAmount: number;
  totalEnrollments: number;
  enrolledThisMonth: number;
}

export interface StudentsResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  stats?: StudentStatsSummary;
}

export interface StudentFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  grade?: string;
  page: number;
  limit: number;
}
