import { prisma } from "@/server/data/db";
import type { $Enums, Powiadomienie } from "@prisma/client";

/** A user's notifications, newest first. */
export function listByUser(userId: string): Promise<Powiadomienie[]> {
  return prisma.powiadomienie.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Create a notification for a user. */
export function create(input: {
  userId: string;
  typ: $Enums.TypPowiadomienia;
  tresc: string;
}): Promise<Powiadomienie> {
  return prisma.powiadomienie.create({ data: input });
}

/**
 * Mark a single notification as read, scoped to its owner. Returns the affected count
 * (0 when the notification does not exist or belongs to another user).
 */
export function markAsRead(userId: string, id: string): Promise<{ count: number }> {
  return prisma.powiadomienie.updateMany({
    where: { id, userId },
    data: { przeczytane: true },
  });
}

/** Mark all of a user's unread notifications as read; returns the affected count. */
export function markAllReadByUser(userId: string): Promise<{ count: number }> {
  return prisma.powiadomienie.updateMany({
    where: { userId, przeczytane: false },
    data: { przeczytane: true },
  });
}
