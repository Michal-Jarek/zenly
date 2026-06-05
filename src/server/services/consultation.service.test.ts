import { describe, it, expect, vi, beforeEach } from "vitest";
import { bookConsultation } from "@/server/services/consultation.service";
import { SlotAlreadyTakenError } from "@/server/domain/errors";
import { bookConsultation as bookConsultationRepo } from "@/server/data/wizyta.repository";

vi.mock("@/server/data/wizyta.repository", () => ({
  bookConsultation: vi.fn(),
}));
vi.mock("@/server/data/psycholog.repository", () => ({
  listPsychologowieWithFreeTerminy: vi.fn(),
}));
vi.mock("@/server/data/termin.repository", () => ({
  listFreeTerminy: vi.fn(),
}));

const mockedBook = vi.mocked(bookConsultationRepo);

describe("bookConsultation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the repository and returns the created visit", async () => {
    const wizyta = { id: "v1" };
    mockedBook.mockResolvedValue(wizyta as never);

    await expect(bookConsultation("user-1", "term-1")).resolves.toBe(wizyta);
    expect(mockedBook).toHaveBeenCalledWith({ userId: "user-1", terminId: "term-1" });
  });

  it("propagates SlotAlreadyTakenError when the slot was taken", async () => {
    mockedBook.mockRejectedValue(new SlotAlreadyTakenError());
    await expect(bookConsultation("user-1", "term-1")).rejects.toBeInstanceOf(
      SlotAlreadyTakenError,
    );
  });
});
