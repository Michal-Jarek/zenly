// Domain error taxonomy. Services throw these; the future transport/RBAC layer (steps 3/4/6)
// maps them to HTTP status / SecurityEvent via `instanceof`. Pure — no logging here.

/** Thrown when a user tries to access a resource they do not own (RB-29). */
export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** Thrown when input fails a business validation rule. Carries the individual messages. */
export class ValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[], message = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/** Thrown when a referenced entity does not exist. */
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Thrown when booking a consultation slot that was already taken (concurrent booking). */
export class SlotAlreadyTakenError extends Error {
  constructor(message = "Consultation slot already taken") {
    super(message);
    this.name = "SlotAlreadyTakenError";
  }
}

/** Thrown when submitting answers to a survey that is missing or inactive. */
export class SurveyNotActiveError extends Error {
  constructor(message = "Survey is not active") {
    super(message);
    this.name = "SurveyNotActiveError";
  }
}

/** Thrown when a mutating request fails the same-origin (CSRF) check at the transport layer. */
export class CsrfError extends Error {
  constructor(message = "Cross-origin request rejected") {
    super(message);
    this.name = "CsrfError";
  }
}

/** Thrown when an action requires a logged-in user but no valid session exists (RB-04). */
export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/** Thrown on registration when the login or email is already taken (RB-02). */
export class CredentialsTakenError extends Error {
  constructor(message = "Login or email already taken") {
    super(message);
    this.name = "CredentialsTakenError";
  }
}

/** Thrown on login for an unknown login OR a wrong password — generic, never reveals which (anti-enumeration). */
export class InvalidCredentialsError extends Error {
  constructor(message = "Invalid credentials") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

/** Thrown on login when the account is temporarily locked after too many failed attempts (RB-04). */
export class AccountLockedError extends Error {
  constructor(message = "Account temporarily locked") {
    super(message);
    this.name = "AccountLockedError";
  }
}
