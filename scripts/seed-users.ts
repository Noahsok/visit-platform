import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { name: "Noah", username: "noah", email: "owner@visit.bar", role: "owner" as const, passcode: "1196" },
  { name: "Alex", username: "alex", email: "manager@visit.bar", role: "manager" as const, passcode: "2026" },
  { name: "Sam", username: "sam", email: "bartender@visit.bar", role: "bartender" as const, passcode: "3030" },
  { name: "Jordan", username: "jordan", email: "door@visit.bar", role: "door" as const, passcode: "4040" },
  { name: "JB", username: "jb", email: "jb@visit.bar", role: "prep" as const, passcode: "5050" },
];

async function main() {
  console.log("Seeding users...\n");

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, username: u.username, role: u.role, passcode: u.passcode },
      create: {
        name: u.name,
        username: u.username,
        email: u.email,
        passcode: u.passcode,
        role: u.role,
      },
    });

    console.log(`  ${u.role.padEnd(10)} → ${u.name.padEnd(8)} passcode: ${u.passcode} (${user.id})`);
  }

  // Link all users to existing venues
  const venues = await prisma.venue.findMany({ where: { isActive: true } });

  if (venues.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: USERS.map((u) => u.email) } },
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

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
