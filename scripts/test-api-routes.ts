/* eslint-disable */
/**
 * Verification for Next.js API Route Handlers.
 * Run: tsx --conditions=react-server scripts/test-api-routes.ts
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Mock "server-only" to avoid throwing an error in tsx outside Next.js runtime
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    exports: {},
    loaded: true,
    filename: serverOnlyPath,
    children: [],
    path: "",
    paths: [],
  } as any;
} catch (e) {
  // Ignore
}

// Set fake dummy Supabase environmental variables to successfully instantiate supabaseServer
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SECRET_KEY = "sb_secret_testvalue1234567890abcdef";

import { NextRequest } from "next/server";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runApiTests() {
  // Dynamically import routes so they pick up our process.env changes
  const { GET: healthGET } = await import("../src/app/api/health/route");
  const { POST: analyticsPOST } = await import("../src/app/api/analytics/route");

  console.log("GET /api/health Verification");
  try {
    const req = new NextRequest("http://localhost:3000/api/health", {
      headers: {
        authorization: "Bearer debug-token-test",
      },
    });

    const response = await healthGET(req);
    check("health route handler executes without throwing", response !== undefined);
    check(
      "response status is successful (200) or service unavailable (503)",
      response.status === 200 || response.status === 503
    );

    const bodyText = await response.text();
    check(
      "response returns non-empty content",
      typeof bodyText === "string" && bodyText.length > 0
    );
  } catch (err) {
    check(
      "health route handler runs successfully",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log("POST /api/analytics Validation Check (Invalid payload)");
  try {
    // Construct request with invalid payload (empty events list)
    const payload = {
      events: [],
    };

    const bodyStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(payload)));
        controller.close();
      },
    });

    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: bodyStream,
      duplex: "half",
      headers: {
        "content-type": "application/json",
      },
    } as any);

    const response = await analyticsPOST(req);
    check("analytics route handler executing on invalid payload", response !== undefined);
    check(
      "response status is bad request (400) or service unavailable (503)",
      response.status === 400 || response.status === 503
    );
  } catch (err) {
    check(
      "analytics route handler executes without error",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log("POST /api/analytics Excess Sizing Gating check");
  try {
    const hugePayload = {
      events: Array(1000).fill({
        type: "click",
        path: "/cities/paris",
        referrer: "google.com",
        timestamp: new Date().toISOString(),
      }),
    };
    const bodyStr = JSON.stringify(hugePayload);

    // Let's create an oversized body stream (> 64KB limit)
    const bodyStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(bodyStr));
        controller.close();
      },
    });

    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: bodyStream,
      duplex: "half",
      headers: {
        "content-type": "application/json",
        "content-length": String(new TextEncoder().encode(bodyStr).byteLength),
      },
    } as any);

    const response = await analyticsPOST(req);
    check("analytics route blocks oversized payload", response !== undefined);
    check("response status is payload too large (413)", response.status === 413);
  } catch (err) {
    check(
      "analytics route blocks oversized payload successfully",
      false,
      err instanceof Error ? err.message : String(err)
    );
  }

  if (failures > 0) {
    console.error(`\nAPI Route verification failed with ${failures} failure(s)`);
    process.exit(1);
  } else {
    console.log("\nAll API Route verification tests passed successfully!");
    process.exit(0);
  }
}

runApiTests();
