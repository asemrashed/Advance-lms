import mongoose, { Schema, Document, Model } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  selectedBatchId?: mongoose.Types.ObjectId;

  enrolledAt: Date;
  lastAccessedAt?: Date;
  completedAt?: Date;
  droppedAt?: Date;
  suspendedAt?: Date;

  status:
    | "enrolled"
    | "in_progress"
    | "completed"
    | "suspended"
    | "dropped";

  progress: number;

  paymentStatus: "pending" | "paid" | "failed";
  paymentAmount?: number;
  paymentMethod?: string;
  paymentId?: string;

  /** Billing plan: monthly = time-bound access; full = one-time lifetime access. */
  billingPlan: "monthly" | "full";
  /** Access end date for monthly plan; unset/null for full (lifetime). */
  accessExpiresAt?: Date;
  /** When set, staff has blocked this student's access regardless of payment. */
  accessBlocked?: boolean;
  /** Grace deadline granted by staff — access allowed until this date even if unpaid/expired. */
  paymentDueAt?: Date;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

interface EnrollmentModel extends Model<IEnrollment> {
  getStats(): Promise<unknown>;
  getCourseEnrollmentCount(courseId: string): Promise<number>;
  getStudentEnrollmentCount(studentId: string): Promise<number>;
}

const EnrollmentSchema = new Schema<IEnrollment, EnrollmentModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      index: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },
    selectedBatchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "enrolled",
        "in_progress",
        "completed",
        "suspended",
        "dropped",
      ],
      default: "enrolled",
      required: true,
      index: true,
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      required: true,
    },

    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
    },

    droppedAt: {
      type: Date,
    },

    suspendedAt: {
      type: Date,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      required: true,
      index: true,
    },

    paymentAmount: {
      type: Number,
      min: 0,
    },

    paymentMethod: {
      type: String,
      trim: true,
    },

    paymentId: {
      type: String,
      trim: true,
      index: true,
    },

    billingPlan: {
      type: String,
      enum: ["monthly", "full"],
      default: "full",
      required: true,
      index: true,
    },

    accessExpiresAt: {
      type: Date,
      index: true,
    },

    accessBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    paymentDueAt: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

EnrollmentSchema.index(
  { student: 1, course: 1 },
  { unique: true },
);

EnrollmentSchema.index({ course: 1, status: 1 });
EnrollmentSchema.index({ student: 1, status: 1 });
EnrollmentSchema.index({ enrolledAt: -1 });

EnrollmentSchema.pre("save", function () {
  const now = new Date();

  if (this.isModified("status")) {
    switch (this.status) {
      case "completed":
        this.completedAt = now;
        this.progress = 100;
        break;

      case "dropped":
        this.droppedAt = now;
        break;

      case "suspended":
        this.suspendedAt = now;
        break;

      case "in_progress":
        this.lastAccessedAt = now;
        break;
    }
  }

  if (
    this.progress > 0 &&
    this.progress < 100 &&
    this.status === "enrolled"
  ) {
    this.status = "in_progress";
  }

  if (this.progress >= 100) {
    this.status = "completed";
    this.completedAt = this.completedAt || now;
  }

  if (this.isModified("progress")) {
    this.lastAccessedAt = now;
  }
});

EnrollmentSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,

        total: { $sum: 1 },

        enrolled: {
          $sum: {
            $cond: [{ $eq: ["$status", "enrolled"] }, 1, 0],
          },
        },

        in_progress: {
          $sum: {
            $cond: [
              { $eq: ["$status", "in_progress"] },
              1,
              0,
            ],
          },
        },

        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
          },
        },

        dropped: {
          $sum: {
            $cond: [{ $eq: ["$status", "dropped"] }, 1, 0],
          },
        },

        suspended: {
          $sum: {
            $cond: [{ $eq: ["$status", "suspended"] }, 1, 0],
          },
        },

        paid: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "paid"] },
              1,
              0,
            ],
          },
        },

        pending: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "pending"] },
              1,
              0,
            ],
          },
        },

        totalRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "paid"] },
              "$paymentAmount",
              0,
            ],
          },
        },

        averageProgress: {
          $avg: "$progress",
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      enrolled: 0,
      in_progress: 0,
      completed: 0,
      dropped: 0,
      suspended: 0,
      paid: 0,
      pending: 0,
      totalRevenue: 0,
      averageProgress: 0,
    }
  );
};

EnrollmentSchema.statics.getCourseEnrollmentCount =
  async function (courseId: string) {
    return this.countDocuments({
      course: courseId,
      status: {
        $in: ["enrolled", "in_progress", "completed"],
      },
    });
  };

EnrollmentSchema.statics.getStudentEnrollmentCount =
  async function (studentId: string) {
    return this.countDocuments({
      student: studentId,
      status: {
        $in: ["enrolled", "in_progress", "completed"],
      },
    });
  };

const Enrollment = defineModel(
  "Enrollment",
  EnrollmentSchema as unknown as Schema,
) as Model<IEnrollment, EnrollmentModel>;

export default Enrollment;