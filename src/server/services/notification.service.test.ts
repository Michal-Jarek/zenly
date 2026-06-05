import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  markNotificationRead,
  createNotification,
} from "@/server/services/notification.service";
import { NotFoundError } from "@/server/domain/errors";
import { markAsRead, create } from "@/server/data/powiadomienie.repository";

vi.mock("@/server/data/powiadomienie.repository", () => ({
  listByUser: vi.fn(),
  create: vi.fn(),
  markAsRead: vi.fn(),
  markAllReadByUser: vi.fn(),
}));

const mockedMarkAsRead = vi.mocked(markAsRead);
const mockedCreate = vi.mocked(create);

describe("markNotificationRead (owner-scoped)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the update to the user and resolves when one row is affected", async () => {
    mockedMarkAsRead.mockResolvedValue({ count: 1 });
    await expect(markNotificationRead("user-1", "n1")).resolves.toBeUndefined();
    expect(mockedMarkAsRead).toHaveBeenCalledWith("user-1", "n1");
  });

  it("throws NotFound when the notification is missing or owned by another user", async () => {
    mockedMarkAsRead.mockResolvedValue({ count: 0 });
    await expect(markNotificationRead("user-1", "n1")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the notification fields through to the repository", async () => {
    mockedCreate.mockResolvedValue({} as never);
    await createNotification("user-1", "PRZERWA", "Time for a break");
    expect(mockedCreate).toHaveBeenCalledWith({
      userId: "user-1",
      typ: "PRZERWA",
      tresc: "Time for a break",
    });
  });
});
