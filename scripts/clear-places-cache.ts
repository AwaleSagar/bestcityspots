import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

(async () => {
  const cityName = process.argv[2] ?? "Pune";
  const { data, error } = await s
    .from("city_places_cache")
    .delete()
    .eq("city_name", cityName)
    .select("city_name, place_type");
  console.log("deleted:", data, "err:", error?.message);
})();
