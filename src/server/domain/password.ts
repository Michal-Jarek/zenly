const MIN_LENGTH = 12;

/**
 * Validate password strength: at least 12 characters with a lowercase letter,
 * an uppercase letter, a digit, and a special (non-alphanumeric) character.
 *
 * @param pwd - The candidate password.
 * @returns `valid` plus a list of human-readable error messages (empty when valid).
 */
export function validatePasswordStrength(pwd: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (pwd.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long.`);
  }
  if (!/[a-z]/.test(pwd)) {
    errors.push("Password must contain a lowercase letter.");
  }
  if (!/[A-Z]/.test(pwd)) {
    errors.push("Password must contain an uppercase letter.");
  }
  if (!/[0-9]/.test(pwd)) {
    errors.push("Password must contain a digit.");
  }
  if (!/[^A-Za-z0-9]/.test(pwd)) {
    errors.push("Password must contain a special character.");
  }

  return { valid: errors.length === 0, errors };
}
