/**
 * Seeds one approved restaurant with a small menu, for local testing of
 * restaurant browsing and checkout. Run once you've filled in .env with a
 * real Firebase service account:
 *
 *   cd services/backend
 *   npx tsx scripts/seed.ts [ownerUid]
 *
 * If you omit ownerUid, the restaurant is created with a placeholder owner
 * ("seed-owner-placeholder") — fine for browsing/checkout testing, but
 * you'll want a real uid (from your own signed-up account) before testing
 * the restaurant_owner dashboard in Phase 3.
 */

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

import { initFirebaseAdmin, getFirestore } from "../src/config/firebase.js";

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore
  require("dotenv").config();
} catch {
  // dotenv may not be installed in some environments; continue with process.env
}

async function main() {
  initFirebaseAdmin();
  const db = getFirestore();

  const ownerUid = process.argv[2] ?? "seed-owner-placeholder";
  const now = new Date().toISOString();

  const restaurantRef = db.collection("restaurants").doc();
  await restaurantRef.set({
    name: "Richy's Kitchen",
    ownerId: ownerUid,
    description: "Home-style Ghanaian classics, made fresh daily.",
    cuisineTypes: ["Ghanaian", "Grilled"],
    logoUrl: null,
    coverImageUrl: null,
    address: {
      line1: "12 Independence Ave",
      city: "Accra",
      region: "Greater Accra",
      geopoint: { lat: 5.6037, lng: -0.187 },
    },
    operatingHours: [
      { day: "mon", open: "09:00", close: "21:00", isClosed: false },
      { day: "tue", open: "09:00", close: "21:00", isClosed: false },
      { day: "wed", open: "09:00", close: "21:00", isClosed: false },
      { day: "thu", open: "09:00", close: "21:00", isClosed: false },
      { day: "fri", open: "09:00", close: "22:00", isClosed: false },
      { day: "sat", open: "10:00", close: "22:00", isClosed: false },
      { day: "sun", open: "10:00", close: "20:00", isClosed: false },
    ],
    status: "approved",
    isOpenNow: true,
    commissionRate: 0.15,
    deliveryFeeOverride: null,
    ratingAvg: 4.8,
    ratingCount: 212,
    createdAt: now,
    updatedAt: now,
  });

  const menuItems = [
    {
      name: "Smoky jollof rice",
      description: "Slow-cooked tomato jollof with charred pepper and thyme.",
      price: 4500,
      category: "Jollof & rice",
      isAvailable: true,
      modifiers: [
        {
          name: "Protein",
          required: true,
          options: [
            { label: "Chicken", priceDelta: 0 },
            { label: "Beef", priceDelta: 500 },
            { label: "No meat", priceDelta: -300 },
          ],
        },
      ],
    },
    {
      name: "Grilled tilapia",
      description: "Whole tilapia, pepper sauce, and a side of kelewele.",
      price: 6800,
      category: "Grilled",
      isAvailable: true,
      modifiers: [],
    },
    {
      name: "Light soup with goat meat",
      description: "Peppery, aromatic broth simmered with tender goat meat.",
      price: 5200,
      category: "Soups",
      isAvailable: true,
      modifiers: [],
    },
  ];

  for (const item of menuItems) {
    await restaurantRef.collection("menuItems").add({
      ...item,
      restaurantId: restaurantRef.id,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`Seeded restaurant ${restaurantRef.id} with ${menuItems.length} menu items.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
