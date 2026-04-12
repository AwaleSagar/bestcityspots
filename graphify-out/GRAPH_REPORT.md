# Graph Report - src  (2026-04-12)

## Corpus Check
- Corpus is ~29,873 words - fits in a single context window. You may not need a graph.

## Summary
- 228 nodes · 231 edges · 64 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Places Data Pipeline|Places Data Pipeline]]
- [[_COMMUNITY_Experiences Section UI|Experiences Section UI]]
- [[_COMMUNITY_Constellation Background Animation|Constellation Background Animation]]
- [[_COMMUNITY_Analytics Event Processing|Analytics Event Processing]]
- [[_COMMUNITY_Analytics Session Management|Analytics Session Management]]
- [[_COMMUNITY_City Search & Lookup|City Search & Lookup]]
- [[_COMMUNITY_City Sphere Visualization|City Sphere Visualization]]
- [[_COMMUNITY_City Ranking Engine|City Ranking Engine]]
- [[_COMMUNITY_Local Storage Utilities|Local Storage Utilities]]
- [[_COMMUNITY_Weather & Air Quality Metrics|Weather & Air Quality Metrics]]
- [[_COMMUNITY_AI City Intelligence|AI City Intelligence]]
- [[_COMMUNITY_Cache Configuration|Cache Configuration]]
- [[_COMMUNITY_Weather Data Fetching|Weather Data Fetching]]
- [[_COMMUNITY_Sphere Category Navigation|Sphere Category Navigation]]
- [[_COMMUNITY_Image Optimization|Image Optimization]]
- [[_COMMUNITY_City Vitals Display|City Vitals Display]]
- [[_COMMUNITY_Geo Consent Banner|Geo Consent Banner]]
- [[_COMMUNITY_Network Quality Hook|Network Quality Hook]]
- [[_COMMUNITY_Experiences Skeleton UI|Experiences Skeleton UI]]
- [[_COMMUNITY_City Detail Page|City Detail Page]]
- [[_COMMUNITY_Scroll Reveal Animation|Scroll Reveal Animation]]
- [[_COMMUNITY_City Search Input|City Search Input]]
- [[_COMMUNITY_Image Transform Utilities|Image Transform Utilities]]
- [[_COMMUNITY_Robots.txt|Robots.txt]]
- [[_COMMUNITY_Server Actions|Server Actions]]
- [[_COMMUNITY_Sitemap|Sitemap]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_Top Cities Page|Top Cities Page]]
- [[_COMMUNITY_About Page|About Page]]
- [[_COMMUNITY_AI Briefing Client|AI Briefing Client]]
- [[_COMMUNITY_AI Briefing Section|AI Briefing Section]]
- [[_COMMUNITY_Sphere API Route|Sphere API Route]]
- [[_COMMUNITY_Analytics API Route|Analytics API Route]]
- [[_COMMUNITY_Hotspot UI|Hotspot UI]]
- [[_COMMUNITY_Free Resource CTA|Free Resource CTA]]
- [[_COMMUNITY_Site Footer|Site Footer]]
- [[_COMMUNITY_Mobile Bottom Nav|Mobile Bottom Nav]]
- [[_COMMUNITY_Theme Provider|Theme Provider]]
- [[_COMMUNITY_Site Navigation|Site Navigation]]
- [[_COMMUNITY_Client Effects|Client Effects]]
- [[_COMMUNITY_Floral Accent Effect|Floral Accent Effect]]
- [[_COMMUNITY_Top Cities Page Content|Top Cities Page Content]]
- [[_COMMUNITY_Page Tracker Analytics|Page Tracker Analytics]]
- [[_COMMUNITY_Recent Searches Hook|Recent Searches Hook]]
- [[_COMMUNITY_Device Type Hook|Device Type Hook]]
- [[_COMMUNITY_Number Formatting|Number Formatting]]
- [[_COMMUNITY_Analytics Hook|Analytics Hook]]
- [[_COMMUNITY_Geo Distance Utilities|Geo Distance Utilities]]
- [[_COMMUNITY_Open Graph Image|Open Graph Image]]
- [[_COMMUNITY_AI Briefing Skeleton|AI Briefing Skeleton]]
- [[_COMMUNITY_Scroll Progress UI|Scroll Progress UI]]
- [[_COMMUNITY_Interactive Button UI|Interactive Button UI]]
- [[_COMMUNITY_Breadcrumbs UI|Breadcrumbs UI]]
- [[_COMMUNITY_Trust Indicators Section|Trust Indicators Section]]
- [[_COMMUNITY_Hero Header Section|Hero Header Section]]
- [[_COMMUNITY_Home Search Showcase|Home Search Showcase]]
- [[_COMMUNITY_Testimonials Section|Testimonials Section]]
- [[_COMMUNITY_Theme Toggle|Theme Toggle]]
- [[_COMMUNITY_Visual Effects|Visual Effects]]
- [[_COMMUNITY_About Page Content|About Page Content]]
- [[_COMMUNITY_Analytics Index|Analytics Index]]
- [[_COMMUNITY_Input Validation|Input Validation]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]

## God Nodes (most connected - your core abstractions)
1. `fetchFreshPlaces()` - 11 edges
2. `processAnalyticsBatch()` - 10 edges
3. `getTopPlaces()` - 7 edges
4. `RankingEngine` - 6 edges
5. `fetchAndCacheMetrics()` - 5 edges
6. `sanitizeKey()` - 4 edges
7. `persistCityNotes()` - 4 edges
8. `clearNote()` - 4 edges
9. `findNearestCity()` - 4 edges
10. `hasStorage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Places Data Pipeline"
Cohesion: 0.18
Nodes (22): buildPlaceImagePublicUrl(), buildPlacesRequestKey(), dedupePlaces(), enrichRankedPlaceImages(), fetchAndCachePlaces(), fetchFreshPlaces(), fetchFromGoogle(), filterPlacesByRadius() (+14 more)

### Community 1 - "Experiences Section UI"
Cohesion: 0.15
Nodes (10): clearNote(), getInsiderTips(), getNeighborhood(), parseStoredNotes(), persistCityNotes(), sanitizeKey(), sanitizeNotes(), saveNote() (+2 more)

### Community 2 - "Constellation Background Animation"
Cohesion: 0.22
Nodes (3): buildSpatialGrid(), generateConnections(), getNeighborStars()

### Community 3 - "Analytics Event Processing"
Cohesion: 0.35
Nodes (10): getToday(), parseReferrer(), parseUserAgent(), processAnalyticsBatch(), recordCityView(), recordDailyVisitorStats(), recordDeviceStats(), recordGeoStats() (+2 more)

### Community 4 - "Analytics Session Management"
Cohesion: 0.29
Nodes (2): generateSessionId(), getOrCreateSession()

### Community 5 - "City Search & Lookup"
Cohesion: 0.39
Nodes (6): findNearest(), findNearestCity(), getTopCities(), normalizeQuery(), queryCitiesInBox(), searchCities()

### Community 6 - "City Sphere Visualization"
Cohesion: 0.29
Nodes (0): 

### Community 7 - "City Ranking Engine"
Cohesion: 0.38
Nodes (1): RankingEngine

### Community 8 - "Local Storage Utilities"
Cohesion: 0.52
Nodes (6): getJsonStorageItem(), getStorageItem(), hasStorage(), removeStorageItem(), setJsonStorageItem(), setStorageItem()

### Community 9 - "Weather & Air Quality Metrics"
Cohesion: 0.52
Nodes (6): comfortFromTemp(), fetchAndCacheMetrics(), getCityMetrics(), getOpenMeteoAirQuality(), getOpenMeteoWeather(), toMetrics()

### Community 10 - "AI City Intelligence"
Cohesion: 0.53
Nodes (5): getCityInsight(), getIntelligentTrendingCities(), isFresh(), matchCitiesInDb(), sanitizeJsonResponse()

### Community 11 - "Cache Configuration"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Weather Data Fetching"
Cohesion: 0.7
Nodes (4): fetchFreshWeather(), getAqiLabel(), getCityWeather(), parseCachedWeather()

### Community 13 - "Sphere Category Navigation"
Cohesion: 0.5
Nodes (2): fisherYatesShuffle(), getMixedCitiesFromCategories()

### Community 14 - "Image Optimization"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "City Vitals Display"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "Geo Consent Banner"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Network Quality Hook"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Experiences Skeleton UI"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "City Detail Page"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Scroll Reveal Animation"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "City Search Input"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Image Transform Utilities"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Robots.txt"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Server Actions"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Sitemap"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Home Page"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Top Cities Page"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "About Page"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "AI Briefing Client"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "AI Briefing Section"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Sphere API Route"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Analytics API Route"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Hotspot UI"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Free Resource CTA"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Site Footer"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Mobile Bottom Nav"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Theme Provider"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Site Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Client Effects"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Floral Accent Effect"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Top Cities Page Content"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Page Tracker Analytics"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Recent Searches Hook"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Device Type Hook"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Number Formatting"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Analytics Hook"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Geo Distance Utilities"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Open Graph Image"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "AI Briefing Skeleton"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Scroll Progress UI"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Interactive Button UI"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Breadcrumbs UI"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Trust Indicators Section"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Hero Header Section"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Home Search Showcase"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Testimonials Section"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Theme Toggle"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Visual Effects"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "About Page Content"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Analytics Index"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Input Validation"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Supabase Client"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Robots.txt`** (2 nodes): `robots()`, `robots.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Server Actions`** (2 nodes): `fetchTrendingDestinations()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sitemap`** (2 nodes): `sitemap()`, `sitemap.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Page`** (2 nodes): `Home()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Top Cities Page`** (2 nodes): `TopCitiesPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `About Page`** (2 nodes): `AboutPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Briefing Client`** (2 nodes): `getSeasonColor()`, `AIBriefingClient.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Briefing Section`** (2 nodes): `AIBriefingSection()`, `AIBriefingSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sphere API Route`** (2 nodes): `GET()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics API Route`** (2 nodes): `POST()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hotspot UI`** (2 nodes): `Hotspot()`, `Hotspot.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Free Resource CTA`** (2 nodes): `FreeResourceCTA()`, `FreeResourceCTA.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Site Footer`** (2 nodes): `SiteFooter()`, `SiteFooter.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mobile Bottom Nav`** (2 nodes): `MobileBottomNav()`, `MobileBottomNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Theme Provider`** (2 nodes): `ThemeProvider.tsx`, `ThemeProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Site Navigation`** (2 nodes): `SiteNav()`, `SiteNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Client Effects`** (2 nodes): `ClientEffects()`, `ClientEffects.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Floral Accent Effect`** (2 nodes): `FloralAccent()`, `FloralAccent.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Top Cities Page Content`** (2 nodes): `TopCitiesPageContent.tsx`, `CityCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Tracker Analytics`** (2 nodes): `PageTracker()`, `PageTracker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recent Searches Hook`** (2 nodes): `useRecentSearches.ts`, `useRecentSearches()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Device Type Hook`** (2 nodes): `useDeviceType.ts`, `useDeviceType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Number Formatting`** (2 nodes): `formatPopulation()`, `format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics Hook`** (2 nodes): `useAnalytics.ts`, `useAnalytics()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Geo Distance Utilities`** (2 nodes): `haversineKm()`, `geo.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Open Graph Image`** (1 nodes): `opengraph-image.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Briefing Skeleton`** (1 nodes): `AIBriefingSkeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scroll Progress UI`** (1 nodes): `ScrollProgress.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Interactive Button UI`** (1 nodes): `InteractiveButton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Breadcrumbs UI`** (1 nodes): `Breadcrumbs.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Trust Indicators Section`** (1 nodes): `TrustIndicators.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hero Header Section`** (1 nodes): `HeroHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Search Showcase`** (1 nodes): `HomeSearchShowcase.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Testimonials Section`** (1 nodes): `TestimonialsSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Theme Toggle`** (1 nodes): `ThemeToggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Visual Effects`** (1 nodes): `VisualEffects.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `About Page Content`** (1 nodes): `AboutPageContent.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analytics Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input Validation`** (1 nodes): `validation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `supabase.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._