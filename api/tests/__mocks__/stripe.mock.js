// Shared Stripe mock — accessible via globalThis.__mockStripe
if (!globalThis.__mockStripe) {
  globalThis.__mockStripe = {
    checkout: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
    refunds: { create: vi.fn() },
    accounts: { create: vi.fn(), retrieve: vi.fn() },
    accountLinks: { create: vi.fn() },
  };
}

// Export a constructor so `new Stripe(key)` returns the shared mock
module.exports = function Stripe() {
  return globalThis.__mockStripe;
};
module.exports.default = module.exports;
