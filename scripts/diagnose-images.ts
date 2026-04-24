import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

(async () => {
  const b = await s.storage.getBucket("place_images");
  console.log("BUCKET:", JSON.stringify(b.data), "| err:", b.error?.message);

  const list = await s.storage.from("place_images").list("", { limit: 5 });
  console.log(
    "FILES:",
    list.data?.map((f) => f.name),
    "| err:",
    list.error?.message
  );

  const r = await s
    .from("city_places_cache")
    .select("city_name,place_type,places_data")
    .limit(5);
  if (r.error) {
    console.log("QUERY ERR:", r.error.message);
    return;
  }
  if (!r.data || r.data.length === 0) {
    console.log("NO CACHE ROWS");
    return;
  }
  for (const c of r.data) {
    const arr = (c.places_data as Array<{ id: string; displayName?: {text:string}; userRatingCount?: number; rating?: number; imageUrl?: string; blurhash?: string; priceLevel?: string }>) ?? [];
    const withImg = arr.filter((p) => p.imageUrl).length;
    console.log(`\n=== ${c.city_name} / ${c.place_type}: n=${arr.length}, withImg=${withImg} ===`);

    // Simulate UI display: top 5 by userRatingCount
    const displayed = [...arr].sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0)).slice(0, 5);
    console.log("Top 5 displayed (by userRatingCount):");
    for (const p of displayed) {
      console.log(`  ${p.imageUrl ? "✓" : "✗"} "${p.displayName?.text}" (${p.userRatingCount} reviews, ★${p.rating}) price=${p.priceLevel ?? "—"}`);
    }

    // Simulate price-filter UX paths
    const priceLevels = ["PRICE_LEVEL_INEXPENSIVE","PRICE_LEVEL_MODERATE","PRICE_LEVEL_EXPENSIVE","PRICE_LEVEL_VERY_EXPENSIVE"];
    for (const pl of priceLevels) {
      const subset = arr.filter((p) => p.priceLevel === pl);
      if (subset.length === 0) continue;
      const top5 = [...subset].sort((a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0)).slice(0, 5);
      const miss = top5.filter((p) => !p.imageUrl).length;
      console.log(`  price=${pl}: ${top5.length} displayed, ${miss} missing image`);
    }
  }

  // Test a URL
  const sample = r.data
    .flatMap((c) => (c.places_data as Array<{ imageUrl?: string }>) ?? [])
    .find((p) => p.imageUrl)?.imageUrl;
  if (sample) {
    console.log("\nHEAD check:", sample);
    const head = await fetch(sample, { method: "HEAD" });
    console.log("  status:", head.status, "ct:", head.headers.get("content-type"), "len:", head.headers.get("content-length"));
  }
})().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});
