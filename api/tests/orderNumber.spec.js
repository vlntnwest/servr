const { CHARSET, generateCode, withOrderNumber } = require("../lib/orderNumber");

describe("generateCode", () => {
  it("generates a 6-character string", () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
  });

  it("only uses characters from CHARSET", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      for (const char of code) {
        expect(CHARSET).toContain(char);
      }
    }
  });

  it("does not use ambiguous characters O, 0, I, 1", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).not.toMatch(/[O0I1]/);
    }
  });
});

describe("withOrderNumber", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.$transaction = vi.fn();
  });

  it("resolves with result on first success", async () => {
    const fakeOrder = { id: "abc", orderNumber: "A4X9K2" };
    mockPrisma.$transaction.mockResolvedValueOnce(fakeOrder);

    const result = await withOrderNumber(async (_tx, orderNumber) => {
      expect(orderNumber).toHaveLength(6);
      return fakeOrder;
    });

    expect(result).toBe(fakeOrder);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("retries on P2002 collision and resolves on second attempt", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["order_number"] },
    });
    const fakeOrder = { id: "abc", orderNumber: "B5Y8J3" };
    mockPrisma.$transaction
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce(fakeOrder);

    const result = await withOrderNumber(async (_tx, _on) => fakeOrder);
    expect(result).toBe(fakeOrder);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("throws after 5 P2002 collisions with statusCode 500", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
      meta: { target: ["order_number"] },
    });
    mockPrisma.$transaction.mockRejectedValue(p2002);

    await expect(withOrderNumber(async () => {})).rejects.toMatchObject({
      message: "Failed to generate unique order number",
      statusCode: 500,
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(5);
  });

  it("rethrows immediately on non-P2002 errors", async () => {
    const dbError = new Error("Connection failed");
    mockPrisma.$transaction.mockRejectedValueOnce(dbError);

    await expect(withOrderNumber(async () => {})).rejects.toBe(dbError);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
