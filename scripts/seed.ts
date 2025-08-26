// scripts/seed.ts
import { config } from "dotenv";
config({ path: ".env.local" }); // load local envs (DATABASE_URL)
import mongoose, { Types } from "mongoose";
import dbConnect from "../src/lib/db";
import Event from "../src/models/Event";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysFromNow(days: number, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function main() {
  await dbConnect();

  // One random ownerId for all demo events (we’ll replace later when auth is ready)
  const ownerId = new Types.ObjectId();

  const demos = [
    {
      title: "Product Launch Night – test-1",
      description: "An evening to unveil a new product with demos and Q&A.",
      location: "Bengaluru",
      startsAt: daysFromNow(7, 19, 0),
    },
    {
      title: "Tech Meetup 101 – test-2",
      description: "A beginner-friendly tech meetup covering modern web tooling.",
      location: "Remote",
      startsAt: daysFromNow(8, 11, 0),
    },
    {
      title: "Design Workshop – test-3",
      description: "Hands-on UI/UX workshop with practical exercises.",
      location: "Mumbai",
      startsAt: daysFromNow(9, 14, 0),
    },
    {
      title: "Live Music Evening – test-4",
      description: "An open-air live music event featuring local artists.",
      location: "Delhi",
      startsAt: daysFromNow(14, 20, 0),
    },
  ].map((base) => {
    const capacity = base.location.toLowerCase() === "remote" ? 80 : 100;
    const slug = slugify(base.title);
    return {
      ownerId,
      title: base.title,
      description: base.description,
      location: base.location,
      startsAt: base.startsAt,
      slug,
      customFields: {},
      capacity,
      bookedSlots: 0,
      views: 0,
    };
  });

  // Idempotent upsert by slug
    for (const doc of demos) {
        await Event.updateOne(
            { slug: doc.slug },
            {
                $setOnInsert: {
                    ownerId: doc.ownerId,
                    slug: doc.slug,
                    bookedSlots: 0,
                    views: 0,
                    customFields: {},
                    createdAt: new Date(),
                },
                $set: {
                    title: doc.title,
                    description: doc.description,
                    location: doc.location,
                    startsAt: doc.startsAt,
                    capacity: doc.capacity,   // capacity only here
                    updatedAt: new Date(),
                },
            },
            { upsert: true }
        );
    console.log(`✔ upserted: ${doc.title}`);
  }

  await mongoose.connection.close();
  console.log("✅ Seed complete");
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
