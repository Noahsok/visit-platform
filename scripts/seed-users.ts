import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_USERS = [
  { name: "Noah Owner", email: "owner@visit.bar", role: "owner" as const, password: "visit2026" },
  { name: "Alex Manager", email: "manager@visit.bar", role: "manager" as const, password: "visit2026" },
  { name: "Sam Bartender", email: "bartender@visit.bar", role: "bartender" as const, password: "visit2026" },
  { name: "Jordan Door", email: "door@visit.bar", role: "door" as const, password: "visit2026" },
  { name: "Riley Prep", email: "prep@visit.bar", role: "prep" as const, password: "visit2026" },
];

async function main() {
  console.log("Seeding test users...\n");

  for (const u of TEST_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, name: u.name },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });

    console.log(`  ${u.role.padEnd(10)} → ${user.email} (${user.id})`);
  }

  // Link all users to existing venues
  const venues = await prisma.venue.findMany({ where: { isActive: true } });

  if (venues.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: TEST_USERS.map((u) => u.email) } },
    });

    for (const venue of venues) {
      for (const user of users) {
        await prisma.userVenueAccess.upsert({
          where: {
            userId_venueId: { userId: user.id, venueId: venue.id },
          },
          update: {},
          create: { userId: user.id, venueId: venue.id },
        });
      }
    }

    console.log(`\nLinked all users to ${venues.length} venue(s): ${venues.map((v) => v.slug).join(", ")}`);
  }

  console.log("\nDone! All passwords: visit2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
