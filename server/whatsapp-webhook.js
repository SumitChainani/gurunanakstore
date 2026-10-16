"use strict";

const crypto = require("node:crypto");

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

function verifyWebhookChallenge(receivedToken, configuredToken) {
  const expected = String(configuredToken || "");
  const received = String(receivedToken || "");
  if (expected.length < 32 || received.length > 512) return false;
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  const receivedDigest = crypto.createHash("sha256").update(received).digest();
  return crypto.timingSafeEqual(expectedDigest, receivedDigest);
}

function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  const match = /^sha256=([a-f\d]{64})$/i.exec(String(signatureHeader || ""));
  if (!match || !appSecret) return false;
  const expectedDigest = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  const receivedDigest = Buffer.from(match[1], "hex");
  return receivedDigest.length === expectedDigest.length && crypto.timingSafeEqual(expectedDigest, receivedDigest);
}

function readRawWebhookBody(request) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(request.headers["content-length"]);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) {
      request.resume();
      reject(Object.assign(new Error("Webhook payload is too large."), { statusCode: 413 }));
      return;
    }

    const chunks = [];
    let bytesRead = 0;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.on("data", (chunk) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytesRead += buffer.length;
      if (bytesRead > MAX_WEBHOOK_BODY_BYTES) {
        request.resume();
        fail(Object.assign(new Error("Webhook payload is too large."), { statusCode: 413 }));
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks, bytesRead));
    });
    request.on("aborted", () => fail(Object.assign(new Error("Webhook request was interrupted."), { statusCode: 400 })));
    request.on("error", () => fail(Object.assign(new Error("Webhook request could not be read."), { statusCode: 400 })));
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function summarizeWebhookEvents(payload) {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry) || payload.entry.length === 0) {
    throw new Error("Webhook payload has an invalid event envelope.");
  }

  let incomingMessages = 0;
  let statusUpdates = 0;
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) {
      throw new Error("Webhook payload has an invalid entry.");
    }
    for (const change of entry.changes) {
      if (!isRecord(change) || typeof change.field !== "string" || !isRecord(change.value)) {
        throw new Error("Webhook payload has an invalid change.");
      }
      if (change.field !== "messages") continue;
      const messages = change.value.messages === undefined ? [] : change.value.messages;
      const statuses = change.value.statuses === undefined ? [] : change.value.statuses;
      if (!Array.isArray(messages) || !Array.isArray(statuses)) {
        throw new Error("Webhook message and status events must be arrays.");
      }
      if (messages.some((message) => !isRecord(message)) || statuses.some((status) => !isRecord(status))) {
        throw new Error("Webhook message and status events must contain objects.");
      }
      incomingMessages += messages.length;
      statusUpdates += statuses.length;
    }
  }
  return { incomingMessages, statusUpdates };
}

function parseWebhookEvents(rawBody) {
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new Error("Webhook payload is not valid JSON.");
  }
  return summarizeWebhookEvents(payload);
}

module.exports = {
  MAX_WEBHOOK_BODY_BYTES,
  parseWebhookEvents,
  readRawWebhookBody,
  verifyMetaSignature,
  verifyWebhookChallenge
};
