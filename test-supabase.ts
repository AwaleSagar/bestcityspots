import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSearch(query: string) {
  console.log(`Searching for "${query}"...`);
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, city_ascii, country, population")
    .ilike("city_ascii", `%${query}%`)
    .order("population", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) {
    console.error("Error searching:", error);
  } else {
    console.log(`Found ${data?.length} results:`);
    data?.forEach((city) => console.log(`- ${city.city} (${city.country})`));
  }
}

testSearch("Tok");
