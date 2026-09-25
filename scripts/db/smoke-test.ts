/**
 * `npm run db:smoke` — end-to-end check of a running Supabase project (local
 * stack or hosted) through the same Data API the app uses.
 *
 * Read-only by default, so it is safe against production:
 *   · publishable key: reads public data, calls search, is REFUSED on writes,
 *     on service-only RPCs and on server-only tables
 *   · secret key: reads the ledgers and the traffic RPC
 *   · storage: the place_images bucket exists, is public and jpeg-only
 *
 * --allow-writes additionally exercises write RPCs with throwaway values
 * (use only against a local or disposable database).
 */

import { publishableClient, secretClient, describeTarget } from "./env";

const allowWrites = process.argv.includes("--allow-writes");
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log(`Smoke-testing ${describeTarget()}${allowWrites ? " (with writes)" : ""}\n`);
  const pub = publishableClient();
  const secret = secretClient();

  console.log("publishable key (browser / anon)");
  {
    const cities = await pub
      .from("cities")
      .select("id, slug")
      .order("population", { ascending: false })
      .limit(3);
    check(
      "reads cities",
      !cities.error && (cities.data?.length ?? 0) > 0,
      cities.error?.message ?? "no rows — run npm run db:seed"
    );

    const search = await pub.rpc("search_cities", { query: "par", result_limit: 5 });
    check(
      "search_cities works",
      !search.error && (search.data?.length ?? 0) > 0,
      search.error?.message
    );

    const metrics = await pub.from("city_metrics").select("city_id, cost_index").limit(1);
    check("reads the city_metrics view", !metrics.error, metrics.error?.message);

    const write = await pub.from("countries").insert({ iso2: "QQ", iso3: "QQQ", name: "Smoke" });
    check("cannot write reference data", !!write.error, "insert unexpectedly succeeded");

    const claim = await pub.rpc("claim_provider_use", {
      p_provider: "smoke",
      p_day: "2000-01-01",
      p_limit: 1,
    });
    check("cannot call service-only RPCs", !!claim.error, "claim_provider_use was callable");

    const ledger = await pub.from("provider_daily_usage").select("provider").limit(1);
    check("cannot read server-only ledgers", !!ledger.error || (ledger.data?.length ?? 0) === 0);

    const admins = await pub.from("app_admins").select("email").limit(1);
    check("cannot read app_admins", !!admins.error || (admins.data?.length ?? 0) === 0);
  }

  console.log("\nsecret key (server)");
  {
    const usage = await secret.from("provider_daily_usage").select("provider").limit(1);
    check("reads provider usage", !usage.error, usage.error?.message);

    const traffic = await secret.rpc("get_cities_by_traffic", {
      result_limit: 5,
      lookback_days: 30,
    });
    check("get_cities_by_traffic works", !traffic.error, traffic.error?.message);

    const indicators = await secret
      .from("country_indicators")
      .select("iso2", { count: "exact", head: true });
    check(
      "country indicators are loaded",
      !indicators.error && (indicators.count ?? 0) > 0,
      indicators.error?.message ?? "empty — run npm run db:seed"
    );

    const { data: bucket, error: bucketError } = await secret.storage.getBucket("place_images");
    check(
      "place_images bucket is public and jpeg-only",
      !bucketError &&
        bucket?.public === true &&
        (bucket.allowed_mime_types ?? []).join() === "image/jpeg",
      bucketError?.message
    );
  }

  if (allowWrites) {
    console.log("\nwrites (throwaway values)");
    const day = "2000-01-01";
    const first = await secret.rpc("claim_provider_use", {
      p_provider: "smoke-test",
      p_day: day,
      p_limit: 1,
    });
    const second = await secret.rpc("claim_provider_use", {
      p_provider: "smoke-test",
      p_day: day,
      p_limit: 1,
    });
    check("budget claim respects the limit", first.data === true && second.data === false);
    await secret.from("provider_daily_usage").delete().eq("provider", "smoke-test").eq("day", day);

    const save = await secret.rpc("record_place_save", { p_place_id: "smoke-test-place" });
    check("record_place_save works", !save.error, save.error?.message);
    await secret.from("place_saves_daily").delete().eq("place_id", "smoke-test-place");
  }

  if (failures > 0) {
    console.error(`\n✗ ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✓ all checks passed");
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
