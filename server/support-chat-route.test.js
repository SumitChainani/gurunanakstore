"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

process.env.OPENAI_API_KEY = "test-only-key-never-sent-to-provider";
const { server } = require("./index");

async function send(pathname, body, origin = "https://gurunanakstore.shop") {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = "POST";
  request.url = pathname;
  request.headers = {
    origin,
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.25"
  };
  request.socket = { remoteAddress: "127.0.0.1" };

  return new Promise((resolve) => {
    const response = {
      writeHead(status, headers) {
        this.status = status;
        this.headers = headers;
      },
      end(bodyText) {
        resolve({ status: this.status, headers: this.headers, json: JSON.parse(bodyText || "null") });
      }
    };
    server.emit("request", request, response);
  });
}

test("support endpoint returns a safe reply through the configured AI provider", async () => {
  const previousFetch = global.fetch;
  let capturedUrl = "";
  let capturedRequest;
  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedRequest = options;
    return {
      ok: true,
      json: async () => ({
        output: [{
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Open My Orders and enter your tracking code." }]
        }]
      })
    };
  };

  try {
    const response = await send("/api/support/chat", {
      messages: [{ role: "user", content: "My phone is 8815960890. How do I track an order?" }]
    });
    assert.equal(response.status, 200);
    assert.equal(response.json.reply, "Open My Orders and enter your tracking code.");
    assert.equal(response.headers["Access-Control-Allow-Origin"], "https://gurunanakstore.shop");
    assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
    assert.match(capturedRequest.headers.Authorization, /^Bearer test-only-key/);
    assert.doesNotMatch(capturedRequest.body, /8815960890|test-only-key/);
    assert.doesNotMatch(JSON.stringify(response.json), /test-only-key/);
  } finally {
    global.fetch = previousFetch;
  }
});

test("support endpoint rejects an unapproved website origin", async () => {
  const response = await send("/api/support/chat", {
    messages: [{ role: "user", content: "Hello" }]
  }, "https://untrusted.example");
  assert.equal(response.status, 403);
});
