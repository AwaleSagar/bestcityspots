-- Add new AI insight columns for enhanced city intelligence
-- These columns support Pros & Cons, Best For, Budget, Safety, and seasonal advice

ALTER TABLE city_ai_insights
  ADD COLUMN IF NOT EXISTS pros_cons jsonb,
  ADD COLUMN IF NOT EXISTS best_for jsonb,
  ADD COLUMN IF NOT EXISTS budget jsonb,
  ADD COLUMN IF NOT EXISTS safety jsonb,
  ADD COLUMN IF NOT EXISTS best_months text,
  ADD COLUMN IF NOT EXISTS avoid_months text;

COMMENT ON COLUMN city_ai_insights.pros_cons IS 'JSON: { pros: string[], cons: string[] }';
COMMENT ON COLUMN city_ai_insights.best_for IS 'JSON array of traveler types e.g. ["budget travelers", "families"]';
COMMENT ON COLUMN city_ai_insights.budget IS 'JSON: { backpacker: string, midRange: string, luxury: string, currency: string }';
COMMENT ON COLUMN city_ai_insights.safety IS 'JSON: { rating: string, tips: string[] }';
COMMENT ON COLUMN city_ai_insights.best_months IS 'Best months to visit e.g. "March to May"';
COMMENT ON COLUMN city_ai_insights.avoid_months IS 'Months to avoid e.g. "June to August"';
