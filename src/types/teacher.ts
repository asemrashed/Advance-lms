import type { BankDetails } from "@/lib/bankDetails";

export type TeacherAccountStatus = "pending" | "active" | "blocked";

export interface Teacher {
  _id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'instructor';
  accountStatus: TeacherAccountStatus;
  isActive: boolean;
  avatar?: string;
  bio?: string;
  experience?: string;
  education?: string;
  passOutInstitute?: string;
  specialization?: string;
  address?: {
    fullAddress?: string;
  };
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  bankDetails?: BankDetails;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface TeacherFormData {
  email: string;
  phone: string;
  name: string;
  isActive: boolean;
  avatar?: string;
  experience?: string;
  address?: {
    fullAddress?: string;
  };
  password?: string;
}

export interface TeacherUpdateData {
  email?: string;
  phone?: string;
  name?: string;
  accountStatus?: TeacherAccountStatus;
  isActive?: boolean;
  avatar?: string;
  experience?: string;
  address?: {
    fullAddress?: string;
  };
}

export interface TeachersResponse {
  teachers: Teacher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TeacherFilters {
  search: string;
  status: 'all' | 'pending' | 'active' | 'blocked';
  page: number;
  limit: number;
}
