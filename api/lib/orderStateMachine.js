/**
 * Order state machine — defines valid transitions.
 * Used by both manual actions (admin) and system transitions (webhooks).
 */

const ALLOWED_TRANSITIONS = {
  DRAFT: ["PENDING", "ABANDONED", "PAYMENT_FAILED", "CANCELLED"],
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  PENDING_ON_SITE_PAYMENT: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["DELIVERED", "CANCELLED"],
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
