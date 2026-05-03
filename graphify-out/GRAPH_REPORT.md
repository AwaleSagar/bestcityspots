# Graph Report - bestcityspots  (2026-05-03)

## Corpus Check
- 107 files · ~104,609 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 895 nodes · 1235 edges · 69 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]

## God Nodes (most connected - your core abstractions)
1. `serverEnv()` - 18 edges
2. `publicEnv()` - 16 edges
3. `httpFetch()` - 15 edges
4. `Cities Table` - 13 edges
5. `main()` - 12 edges
6. `processAnalyticsBatch()` - 12 edges
7. `fetchFreshPlaces()` - 12 edges
8. `setStorageItem()` - 11 edges
9. `getTopPlaces()` - 11 edges
10. `runTest()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `shouldTrack()` --calls--> `publicEnv()`  [INFERRED]
  src/components/analytics/AnalyticsProvider.tsx → src/lib/env.ts
- `ExperiencesWrapper()` --calls--> `getTopPlaces()`  [INFERRED]
  src/app/cities/[id]/page.tsx → src/lib/places.ts
- `Google Places API Smoke Test` --conceptually_related_to--> `City Places Cache Service Role Policies`  [INFERRED]
  test-google-places.ts → supabase/20260311_places_cache_cost_optimization.sql
- `Supabase City Search Smoke Test` --references--> `Cities Table`  [EXTRACTED]
  test-supabase.ts → supabase/security.sql
- `Supabase City Search Smoke Test` --conceptually_related_to--> `Cities Trigram Search Index`  [INFERRED]
  test-supabase.ts → supabase/performance.sql

## Hyperedges (group relationships)
- **Analytics Aggregate Storage Model** — visitoranalytics_daily_visitor_stats, visitoranalytics_traffic_sources_daily, visitoranalytics_device_stats_daily, visitoranalytics_geo_stats_daily, visitoranalytics_city_views_daily, visitoranalytics_user_actions_daily, analyticsfunctions_atomic_analytics_upsert_rpcs, visitoranalytics_analytics_rls_policies [EXTRACTED 1.00]
- **Elastic City Search Stack** — elasticsearch_f_unaccent, elasticsearch_cities_search_document_trigger, elasticsearch_city_ai_insights_search_sync, elasticsearch_city_search_aliases, elasticsearch_search_cities_elastic_rpc, performance_cities_trigram_search_index, shared_cities_table [EXTRACTED 1.00]
- **Cache Cost Control Stack** — cacheoptimization_cache_hit_stats, cacheoptimization_record_cache_event, cacheoptimization_cache_first_ttl_strategy, placescache_city_places_cache_service_role_policies, placescache_place_details_cache_service_role_policies, cacheversions_cache_schema_versions, cacheversions_prompt_version_columns [INFERRED 0.88]
- **Operational cache warming pipeline** — fn_resolve_cities_warm, fn_warm_places_cache, fn_warm_insights_cache, fn_warm_weather_cache, fn_warm_metrics_cache, table_city_places_cache, table_city_ai_insights, table_city_weather_cache, table_city_metrics [EXTRACTED 0.98]
- **Marketing analytics reporting surface** — fn_analytics_main, fn_get_overview, fn_get_traffic_sources, fn_get_device_stats, fn_get_geo_stats, fn_get_city_views, fn_get_user_actions, concept_marketing_analytics_report [EXTRACTED 0.97]
- **City briefing and experience UI flow** — component_ai_briefing_section, component_ai_briefing_client, component_ai_briefing_skeleton, component_experiences_skeleton, fn_get_local_pulse_tags, fn_get_insider_tips, concept_ai_briefing_tabs, concept_saved_places_notes [EXTRACTED 0.94]
- **City detail experience pipeline** — chunk03:function:CityPage, chunk03:external:getCityById, chunk03:external:getCityWeather, chunk03:external:AIBriefingSection, chunk03:function:CoreMetricsCard, chunk03:function:ExperiencesWrapper, chunk03:function:ExperiencesSection, chunk03:concept:city_guide_composition [INFERRED 0.99]
- **Validated API boundary** — chunk03:function:PlacesSearchGET, chunk03:function:HealthGET, chunk03:function:CitiesSphereGET, chunk03:function:AnalyticsPOST, chunk03:external:validation_schemas, chunk03:concept:thin_route_handlers, chunk03:concept:http_cache_validation [INFERRED 0.98]
- **Trust, motion, and navigation shell** — chunk03:function:HeroHeader, chunk03:function:HomeSearchShowcase, chunk03:function:TrustIndicators, chunk03:function:FreeResourceCTA, chunk03:function:TestimonialsSection, chunk03:function:ScrollReveal, chunk03:function:SiteNav, chunk03:function:MobileBottomNav, chunk03:function:SiteFooter, chunk03:concept:source_transparency, chunk03:concept:motion_accessibility, chunk03:concept:responsive_navigation [INFERRED 0.97]
- **Adaptive city discovery flow** — chunk04:symbol:CitySearch, chunk04:symbol:searchCities, chunk04:symbol:findNearestCity, chunk04:symbol:useRecentSearches, chunk04:symbol:useDeviceType, chunk04:external:browser_geolocation, chunk04:external:supabase, chunk04:concept:adaptive_city_discovery [INFERRED 0.98]
- **Privacy-first analytics flow** — chunk04:symbol:AnalyticsProvider, chunk04:symbol:PageTracker, chunk04:symbol:GeoConsentBanner, chunk04:symbol:AnalyticsPayloadSchema, chunk04:symbol:processAnalyticsBatch, chunk04:external:browser_storage, chunk04:external:supabase, chunk04:concept:privacy_first_analytics [INFERRED 0.98]
- **Provider resilience and canonicalization** — chunk04:symbol:httpFetch, chunk04:symbol:httpJson, chunk04:symbol:CircuitBreaker, chunk04:symbol:CanonicalPlace, chunk04:symbol:CanonicalWeather, chunk04:symbol:CanonicalCityVitals, chunk04:symbol:googlePlaceToCanonical, chunk04:symbol:placeSearchSchema, chunk04:concept:canonical_provider_boundary [INFERRED 0.96]
- **chunk05_hyperedge_ai_insight_pipeline** — chunk05_src_lib_intelligence, chunk05_provider_gemini, chunk05_concept_zod_runtime_validation, chunk05_concept_prompt_versioning, chunk05_concept_supabase_cache_tables, chunk05_concept_cache_first_swr [INFERRED 0.99]
- **chunk05_hyperedge_places_enrichment_flow** — chunk05_src_lib_places, chunk05_provider_google_places, chunk05_src_lib_place_search_utils, chunk05_concept_budget_fallback, chunk05_concept_places_image_enrichment, chunk05_concept_supabase_cache_tables, chunk05_concept_cache_first_swr [INFERRED 0.99]
- **chunk05_hyperedge_weather_metrics_flow** — chunk05_src_lib_weather, chunk05_src_lib_metrics, chunk05_provider_openweather, chunk05_provider_open_meteo, chunk05_concept_weather_provider_fallback, chunk05_concept_supabase_cache_tables, chunk05_concept_cache_first_swr [INFERRED 0.98]
- **cache-first city intelligence system** — chunk06_layered_monolith_architecture, chunk06_ai_city_intelligence, chunk06_google_places_ranking, chunk06_weather_aqi_fusion, chunk06_multimode_city_search, chunk06_layered_supabase_cache_strategy, chunk06_privacy_first_analytics [INFERRED 0.97]
- **validated frontend quality risk cluster** — chunk06_frontend_audit_live_findings, chunk06_note_key_idempotency_bug, chunk06_unicode_search_input_bug, chunk06_mobile_bottom_nav_gap, chunk06_accessibility_regressions, chunk06_abort_and_analytics_risks, chunk06_frontend_quick_wins [INFERRED 0.98]
- **2026 travel platform design direction** — chunk06_award_winning_design_2026, chunk06_design_for_intent, chunk06_multimodal_experience_design, chunk06_biophilic_organic_ui, chunk06_fluid_container_layouts, chunk06_typography_of_trust, chunk06_agentic_personalized_ui, chunk06_hyperlocal_storytelling [INFERRED 0.95]
- **hyperedge_hero_composition** — blue_sky_negative_space, golden_hour_cloudscape, manhattan_skyline, waterfront_reflections [INFERRED]
- **hyperedge_visual_identity** — hero_image, warm_city_lights, manhattan_skyline, hero_layout_usage [INFERRED]
- **document icon composition** — chunk08_document_body, chunk08_folded_corner, chunk08_page_outline, chunk08_text_line_top, chunk08_text_line_middle, chunk08_text_line_bottom [INFERRED]
- **monochrome gray rendering** — chunk08_single_path, chunk08_gray_fill [INFERRED]
- **chunk09:hyperedge:vision_extraction** — chunk09:input:public/vercel.svg, chunk09:shape:vercel_triangle, chunk09:concept:vercel_logo [INFERRED]
- **Combined vector paths compose the Next.js horizontal logo** — path_next_letters, path_n_and_js_suffix, wordmark_next, suffix_js, brand_nextjs [INFERRED]
- **All visible mark components use solid black fill on transparent background** — path_next_letters, path_n_and_js_suffix, wordmark_next, suffix_js [INFERRED]
- **hyperedge_globe_visual_composition** — shape_outer_sphere, shape_longitude_bands, shape_latitude_bands, path_compound_globe_grid [INFERRED]
- **hyperedge_svg_rendering_constraints** — input_public_globe_svg, clip_path_a, path_compound_globe_grid [INFERRED]
- **window_controls_group** — left_control_dot, middle_control_dot, right_control_dot [INFERRED]
- **browser_window_icon_composition** — outer_window_frame, inner_window_panel, top_bar_area, left_control_dot, middle_control_dot, right_control_dot [INFERRED]
- **hyperedge:crystal-composition** — shape:central-diamond, shape:highlight-facet, shape:shadow-facet, shape:inner-core [INFERRED]
- **hyperedge:glow-rendering** — group:glowing-crystal, filter:glow, primitive:glow-blur, primitive:glow-composite [INFERRED]
- **hyperedge:color-depth-system** — linearGradient:crystalGradient, shape:central-diamond, shape:highlight-facet, shape:shadow-facet [INFERRED]

## Communities (107 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (54): adaptive city discovery, privacy-first analytics, browser geolocation API, browser localStorage/sessionStorage, Supabase Postgres/RPC, src/components/analytics/AnalyticsProvider.tsx, src/components/analytics/GeoConsentBanner.tsx, src/components/analytics/PageTracker.tsx (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (35): generateSessionId(), getGeoConsent(), getOrCreateSession(), isNewVisitor(), setGeoConsentStorage(), shouldTrack(), handleAccept(), handleDecline() (+27 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (31): AIBriefingSection(), CityVitalsFallback(), CoreMetricsCard(), ExperiencesWrapper(), classifyAge(), isCacheFresh(), minutes(), getCityById() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (44): AIBriefingClient, AIBriefingSection, AIBriefingSkeleton, ExperienceCardSkeleton, ExperiencesSkeleton, Home, HomeSearchShowcase, AI briefing tabbed planning UI (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (35): haversineKm(), getDistanceKm(), isWithinMaxPriceTier(), mapPriceLevel(), matchesQuery(), sortPlaces(), buildPlaceImagePublicUrl(), buildPlacesRequestKey() (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (44): Atomic Analytics Upsert RPCs, Cache First TTL Strategy, Cache Hit Stats Table, Record Cache Event RPC, Cache Schema Version Columns, AI Prompt Version Columns, City AI Insights Cache Table, City AI Insights Public Write Policy (+36 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): Adaptive media loading, City guide composition, Client-side saved places and notes, HTTP cache and ETag strategy, Thin route handlers validate and delegate, AIBriefingSection, CityVitals, getCityById() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (18): GET(), HealthTimeoutError, withTimeout(), ThemeProvider(), publicEnv(), requirePublicEnv(), requireServerEnv(), serverEnv() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (25): backoffMs(), breakerKey(), CircuitOpenError, getBreaker(), HttpError, httpFetch(), httpJson(), isAbortError() (+17 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (31): Budget coverage fallback for restaurants and hotels, Cache-first stale-while-revalidate, Layered monolith service layer, Lazy env and client initialization, Places image enrichment aligned to UI sort/filter views, Prompt and schema version invalidation, Pure provider wrappers, Structured logs and correlation IDs (+23 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (26): city places cache deletion helper, place image diagnostics, scripts/analytics-report.ts, scripts/clear-places-cache.ts, scripts/diagnose-images.ts, checkMetricsCacheStatus(), checkPlacesCacheStatus(), checkWeatherCacheStatus() (+18 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (26): abort timeout and analytics delivery risks, skip-link and scroll progress accessibility regressions, agentic personalized UI, AI city intelligence, award-winning travel website design 2026, biophilic and organic UI, city AI candidates dataset, Designing for Intent (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (10): PageTracker(), useDeviceType(), useRecentSearches(), LruCache, findNearest(), findNearestCity(), normalizeQuery(), queryCitiesInBox() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (22): AnalyticsProvider/PageTracker/GeoConsentBanner, RootLayout, TopCitiesPage, TopCitiesPageContent, analytics-enabled application shell, marketing analytics report, SEO metadata and structured data, Top 50 ItemList structured data (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (20): checkInsightsCacheStatus(), checkMetricsCacheStatus(), checkPlacesCacheStatus(), checkWeatherCacheStatus(), createSupabaseClient(), getAqiLabel(), getTopCitiesByPopulation(), getTopCitiesByTraffic() (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (19): Motion respects reduced-motion preference, Source transparency and AI labeling, CitySearch, src/components/sections/FreeResourceCTA.tsx, src/components/sections/HomeSearchShowcase.tsx, src/components/ui/Hotspot.tsx, src/components/ui/InteractiveButton.tsx, src/components/ui/ScrollProgress.tsx (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.28
Nodes (13): main(), paint(), probe(), runTest(), shouldRunSuite(), skipTest(), suiteConsistency(), suitePerformance() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (15): backend performance audit report, Conventional Commits and PR checklist, Docker Compose web service, graphify repository rules, layered monolith architecture, Supabase migration conventions, multi-mode city search, Next.js 16 App Router stack (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.26
Nodes (12): POST(), readJsonBodyWithLimit(), getToday(), parseReferrer(), parseUserAgent(), processAnalyticsBatch(), recordCityView(), recordDailyVisitorStats() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.32
Nodes (12): c(), formatNumber(), getCityViews(), getDailyTrend(), getDeviceStats(), getGeoStats(), getOverview(), getTrafficSources() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (13): Faceted crystal logo, SVG definitions, public/logo.svg, glow, Glowing crystal group, crystalGradient, Gaussian blur, Composite source over blur (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (10): extractErrorMessage(), extractPlaces(), formatSample(), isPlaceResult(), isValidDisplayName(), jsonType(), mapJsonLayout(), parseArgs() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (4): OptimizedImageInner(), useNetworkQuality(), generateSizes(), getQualityValue()

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (3): buildSpatialGrid(), generateConnections(), getNeighborStars()

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (11): Responsive navigation shell, src/components/layout/MobileBottomNav.tsx, src/components/layout/SiteFooter.tsx, src/components/layout/SiteNav.tsx, src/components/layout/ThemeProvider.tsx, src/components/layout/ThemeToggle.tsx, MobileBottomNav(), SiteFooter() (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (10): canonical provider boundary, src/lib/http.ts, src/lib/mapping.ts, CanonicalCityVitals, CanonicalPlace, CanonicalWeather, HTTP circuit breaker state machine, googlePlaceToCanonical (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (10): 16x16 SVG canvas, document body, folded top-right corner, gray fill #666, page outline, single compound path, file.svg, bottom text line (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.39
Nodes (8): callOpenRouter(), fetchExistingInsights(), fetchTopCities(), isFresh(), run(), sanitizeJson(), upsertInsight(), worker()

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (8): Blue sky negative space, public/hero.png, Golden cloudscape, Hero city skyline photograph, Hero layout usage, Manhattan skyline, Warm illuminated city lights, Waterfront reflections

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (8): clipPath a, global navigation or location scope, public/globe.svg, compound globe grid path, horizontal latitude bands, vertical longitude bands, outer circular globe silhouette, globe icon

### Community 31 - "Community 31"
Cohesion: 0.46
Nodes (8): inner window panel, left circular control, middle circular control, outer window frame, right circular control, compound path, window.svg, top window bar

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (4): fisherYatesShuffle(), getCitiesFromCategory(), getMixedCitiesFromCategories(), GET()

### Community 33 - "Community 33"
Cohesion: 0.43
Nodes (7): public/next.svg, Next.js logo, N letter and .js suffix, NEXT wordmark letterforms, .js, SVG root element, NEXT

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (4): src/components/features/city/CityVitals.tsx, CityVitals, getAqiColor, getTempColor / getTempIconColor

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (4): src/components/pages/TopCitiesPageContent.tsx, CityCard, CityRow, TopCitiesPageContent

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (4): strict TypeScript style, frontend performance coding guidelines, React functional component conventions, Tailwind accessibility and security style

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (3): Bayesian plus viral ranking verification, scripts/test-ranking.ts, src/lib/ranking

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (3): AboutPage, AboutPageContent, transparent methodology and ethical design

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (3): Vercel logo, public/vercel.svg, Vercel triangle mark

## Knowledge Gaps
- **84 isolated node(s):** `HealthTimeoutError`, `JSON Layout Mapper`, `Places Response Validator`, `Next.js Standalone Security Headers`, `Supabase Storage Image Remote Patterns` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `publicEnv()` connect `Community 7` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `serverEnv()` connect `Community 7` to `Community 8`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `serverEnv()` (e.g. with `currentLevel()` and `isStructured()`) actually correct?**
  _`serverEnv()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `publicEnv()` (e.g. with `shouldTrack()` and `resolvePlaceImage()`) actually correct?**
  _`publicEnv()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `httpFetch()` (e.g. with `newCorrelationId()` and `runPlacesRequest()`) actually correct?**
  _`httpFetch()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HealthTimeoutError`, `JSON Layout Mapper`, `Places Response Validator` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._