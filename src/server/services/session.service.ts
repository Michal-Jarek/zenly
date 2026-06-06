import { NotFoundError } from "@/server/domain/errors";
import { findUserByLogin } from "@/server/data/user.repository";

// Seeded demo employee; the stand-in "current user" until real auth lands in step 4.
const DEMO_EMPLOYEE_LOGIN = "pracownik1";

/**
 * Resolve the id of the acting user. Temporary seam for step 3: returns the seeded demo
 * employee. Step 4 replaces this with a real session lookup (`authService.getSession(cookie)`),
 * at which point a missing session — not a missing seed — becomes the failure mode.
 *
 * @returns The demo employee's id.
 * @throws {NotFoundError} When the demo employee is not seeded.
 */
export async function getDemoEmployeeId(): Promise<string> {
  const user = await findUserByLogin(DEMO_EMPLOYEE_LOGIN);
  if (!user) {
    throw new NotFoundError("Demo employee not seeded.");
  }
  return user.id;
}
