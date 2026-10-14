const test = require("node:test");
const assert = require("node:assert/strict");
const { getOrderTotal } = require("./index");

test("calculates the PhonePe amount in paise using server-side product prices", () => {
  assert.equal(getOrderTotal([{ productId: 1, quantity: 1 }]), 28952);
  assert.equal(getOrderTotal([
    { productId: 1, quantity: 2 },
    { productId: 3, quantity: 1 }
  ]), 108856);
  assert.equal(getOrderTotal([{ productId: 5, quantity: 1 }]), 55352);
  assert.equal(getOrderTotal([{ productId: 9, quantity: 1 }]), 53680);
  assert.equal(getOrderTotal([{ productId: 10, quantity: 1 }]), 22792);
  assert.equal(getOrderTotal([{ productId: 11, quantity: 1 }]), 30712);
  assert.equal(getOrderTotal([{ productId: 12, quantity: 1 }]), 30712);
  assert.equal(getOrderTotal([{ productId: 13, quantity: 1 }]), 37752);
});

test("rejects product IDs that are not in the server catalogue", () => {
  assert.throws(() => getOrderTotal([{ productId: 999, quantity: 1 }]), /invalid product or quantity/i);
});

test("removed products cannot be added to new orders", () => {
  for (const productId of [6, 7, 8]) {
    assert.throws(() => getOrderTotal([{ productId, quantity: 1 }]), /invalid product or quantity/i);
  }
});

test("rejects non-integer or out-of-range quantities", () => {
  assert.throws(() => getOrderTotal([{ productId: 1, quantity: 0 }]), /invalid product or quantity/i);
  assert.throws(() => getOrderTotal([{ productId: 1, quantity: 1.5 }]), /invalid product or quantity/i);
  assert.throws(() => getOrderTotal([{ productId: 1, quantity: 21 }]), /invalid product or quantity/i);
});

test("rejects empty and oversized carts", () => {
  assert.throws(() => getOrderTotal([]), /empty or has too many products/i);
  assert.throws(() => getOrderTotal(Array.from({ length: 21 }, () => ({ productId: 1, quantity: 1 }))), /empty or has too many products/i);
});
