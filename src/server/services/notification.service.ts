import type { TypPowiadomienia } from "@/server/domain/types";
import { NotFoundError } from "@/server/domain/errors";
import {
  listByUser,
  create,
  markAsRead,
  markAllReadByUser,
} from "@/server/data/powiadomienie.repository";

/**
 * List a user's notifications.
 *
 * @param userId - The owner of the notifications.
 * @returns The user's notifications, newest first.
 */
export function listNotifications(userId: string) {
  return listByUser(userId);
}

/**
 * Create a notification for a user.
 *
 * @param userId - The recipient.
 * @param typ - The notification category.
 * @param tresc - The notification text.
 * @returns The created notification.
 */
export function createNotification(userId: string, typ: TypPowiadomienia, tresc: string) {
  return create({ userId, typ, tresc });
}

/**
 * Mark a single notification as read, owner-scoped: a user can only mark their own.
 *
 * @param userId - The owner of the notification.
 * @param notificationId - The notification to update.
 * @throws {NotFoundError} When the notification does not exist or belongs to another user.
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const { count } = await markAsRead(userId, notificationId);
  if (count === 0) {
    throw new NotFoundError("Notification not found.");
  }
}

/**
 * Mark all of a user's notifications as read.
 *
 * @param userId - The owner of the notifications.
 * @returns The number of notifications affected.
 */
export function markAllRead(userId: string) {
  return markAllReadByUser(userId);
}
