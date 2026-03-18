/**
 * Order state machine — defines valid manual transitions.
 * System transitions (e.g. DRAFT → PENDING via Stripe webhook) are NOT governed by this.
 */

const ALLOWED_TRANSITIONS = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  PENDING_ON_SITE_PAYMENT: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["DELIVERED", "CANCELLED"],
  DRAFT: ["CANCELLED"],
  ABANDONED: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
};

function getNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

function isValidTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

module.exports = { getNextStatuses, isValidTransition };
