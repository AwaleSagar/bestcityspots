
import { rankingEngine } from "../src/lib/ranking";
import { Landmark } from "../src/lib/places";

const mockPlaces: Partial<Landmark>[] = [
    {
        id: "1",
        displayName: { text: "Perfect Unknown" },
        rating: 5.0,
        userRatingCount: 2, // Should be low
    },
    {
        id: "2",
        displayName: { text: "The Legend" },
        rating: 4.8,
        userRatingCount: 5000, // Should be #1
    },
    {
        id: "3",
        displayName: { text: "Good Popular" },
        rating: 4.5,
        userRatingCount: 1000, // Should be #2 or #3
    },
    {
        id: "4",
        displayName: { text: "Tourist Trap" },
        rating: 3.5,
        userRatingCount: 15000, // High count, low rating. Should NOT beat "The Legend".
    },
    {
        id: "5",
        displayName: { text: "Solid Local" },
        rating: 4.6,
        userRatingCount: 150, // Should beat "Perfect Unknown"
    },
];

console.log("--- Original List ---");
console.table(mockPlaces.map(p => ({
    name: p.displayName?.text,
    rating: p.rating,
    count: p.userRatingCount
})));

const ranked = rankingEngine.rank(mockPlaces as Landmark[]);

console.log("\n--- Ranked List (Bayesian + Viral) ---");
console.table(ranked.map(p => ({
    name: p.displayName?.text,
    rating: p.rating,
    count: p.userRatingCount,
    score: rankingEngine.getScore(p).toFixed(4)
})));

// Assertions
const names = ranked.map(p => p.displayName?.text);
console.log("\n--- Verification ---");

if (names[0] === "The Legend") {
    console.log("✅ PASS: 'The Legend' is #1");
} else {
    console.log(`❌ FAIL: Expected 'The Legend' to be #1, got '${names[0]}'`);
}

if (names.indexOf("Perfect Unknown") > names.indexOf("Solid Local")) {
    console.log("✅ PASS: 'Perfect Unknown' (2 reviews) is ranked lower than 'Solid Local'");
} else {
    console.log("❌ FAIL: 'Perfect Unknown' ranked higher than 'Solid Local' - Bayesian prior failed.");
}

if (names.indexOf("Tourist Trap") > names.indexOf("The Legend")) {
    console.log("✅ PASS: 'Tourist Trap' did not beat 'The Legend' despite volume.");
} else {
    console.log("❌ FAIL: 'Tourist Trap' beat 'The Legend'");
}
