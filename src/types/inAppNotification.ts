export type InAppNotificationType =
  | "live_class_scheduled"
  | "live_class_updated"
  | "live_class_cancelled"
  | "routine_updated"
  | "routine_removed"
  | "routine_published"
  | "payment_renewal_due";

export interface InAppNotificationRow {
  _id: string;
  type: InAppNotificationType | string;
  title: string;
  message: string;
  batchId?: string;
  liveClassId?: string;
  routineSlotId?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
