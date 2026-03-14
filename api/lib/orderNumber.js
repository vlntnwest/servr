const prisma = require("./prisma");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Wraps a Prisma transaction callback with orderNumber retry logic.
 * Generates a code, passes it to the callback, retries on P2002 collision.
 *
 * @param {Function} txCallback - async (tx, orderNumber) => createdOrder
 * @returns {Promise<object>} the created order
 * @throws {Error} after 5 failed attempts
 */
async function withOrderNumber(txCallback) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateCode();
    try {
      return await prisma.$transaction((tx) => txCallback(tx, orderNumber));
    } catch (err) {
      const isCollision =
        err.code === "P2002" &&
        Array.isArray(err.meta?.target) &&
        err.meta.target.includes("order_number");
      if (isCollision) continue;
      throw err;
    }
  }
  throw Object.assign(new Error("Failed to generate unique order number"), {
    statusCode: 500,
  });
}

module.exports = { CHARSET, generateCode, withOrderNumber };
