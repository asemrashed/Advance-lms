import mongoose, { Document, Schema } from "mongoose";

/** Admin-defined syllabus chapter under a subject. */
export interface ISubjectChapter {
  name: string;
  order: number;
}

/** Exam / QB component under a subject (e.g. Paper 1 = MCQ). */
export interface ISubjectComponent {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: "mcq" | "written";
  order: number;
}

/** Canonical exam subject (e.g. Mathematics / 4024, Physics / 9702). */
export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  /** Syllabus code, e.g. 4024, 0580, 9702 */
  code: string;
  /** Default class / grade for courses and filtering (e.g. O, A, 9). */
  grade?: string;
  slug: string;
  /** Fixed curriculum chapters for this subject (source of truth for courses + QB topics). */
  chapters: ISubjectChapter[];
  /** Exam components (Paper 1 / Paper 2…) — each is MCQ or Written. */
  components: ISubjectComponent[];
  /** Platform QB access price (BDT) for this subject; falls back to PLATFORM_QB_ACCESS_FEE when unset. */
  qbAccessPrice?: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required"],
      trim: true,
      uppercase: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    grade: {
      type: String,
      trim: true,
      index: true,
    },
    chapters: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
          },
          order: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: [],
    },
    components: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
          },
          type: {
            type: String,
            enum: ["mcq", "written"],
            required: true,
          },
          order: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],
      default: [],
    },
    qbAccessPrice: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

SubjectSchema.index({ code: 1 }, { unique: true });
SubjectSchema.index({ slug: 1 }, { unique: true });
SubjectSchema.index({ name: 1 });

const Subject =
  mongoose.models.Subject ||
  mongoose.model<ISubject>("Subject", SubjectSchema, "subjects");

export default Subject;
