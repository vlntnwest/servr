require("dotenv").config({ path: "./.env" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const [restaurantMembers, invitationTokens, restaurants, users] = await Promise.all([
      prisma.$queryRawUnsafe("SELECT * FROM public.restaurant_members"),
      prisma.$queryRawUnsafe("SELECT * FROM public.invitation_tokens"),
      prisma.$queryRawUnsafe("SELECT id, name, slug, created_at FROM public.restaurants"),
      prisma.$queryRawUnsafe("SELECT id, email, full_name, created_at FROM public.users"),
    ]);

    const backup = {
      dumped_at: new Date().toISOString(),
      restaurant_members: restaurantMembers,
      invitation_tokens: invitationTokens,
      restaurants_snapshot: restaurants,
      users_snapshot: users,
    };

    const outPath = path.resolve(__dirname, "../../backup-before-staff-removal.json");
    fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));
    console.log(`Backup written to ${outPath}`);
    console.log(`restaurant_members: ${restaurantMembers.length}`);
    console.log(`invitation_tokens: ${invitationTokens.length}`);
    console.log(`restaurants: ${restaurants.length}`);
    console.log(`users: ${users.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
