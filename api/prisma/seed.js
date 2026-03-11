require("dotenv").config({ path: "./.env" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Pokey Bar Demo",
      slug: "pokey-bar-demo",
      address: "36 rue de la Krutenau",
      zipCode: "67000",
      city: "Strasbourg",
      phone: "0388966339",
      email: "demo@pokeybar.fr",
    },
  });

  // Opening hours (Mon-Fri 11:00-22:00)
  await prisma.openingHour.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  for (let day = 1; day <= 5; day++) {
    await prisma.openingHour.create({
      data: {
        restaurantId: restaurant.id,
        dayOfWeek: day,
        openTime: "11:00",
        closeTime: "22:00",
        order: day,
      },
    });
  }

  // A category
  const categorie = await prisma.categorie.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000010",
      restaurantId: restaurant.id,
      name: "Pokebowls",
      displayOrder: 1,
    },
  });

  // A product
  const product = await prisma.product.upsert({
    where: { id: "00000000-0000-0000-0000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000020",
      restaurantId: restaurant.id,
      name: "Pokebowl Saumon",
      description: "Riz, saumon, avocat, edamame, sauce sesame",
      price: 14.5,
      displayOrder: 1,
    },
  });

  // Link product to categorie
  await prisma.productCategorie.upsert({
    where: {
      productId_categorieId: {
        productId: product.id,
        categorieId: categorie.id,
      },
    },
    update: {},
    create: { productId: product.id, categorieId: categorie.id },
  });

  // An option group
  const optionGroup = await prisma.optionGroup.upsert({
    where: { id: "00000000-0000-0000-0000-000000000030" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000030",
      productId: product.id,
      name: "Sauce",
      hasMultiple: false,
      isRequired: true,
      minQuantity: 1,
      maxQuantity: 1,
    },
  });

  // Option choices
  for (const [i, sauce] of ["Sesame", "Teriyaki", "Spicy Mayo"].entries()) {
    await prisma.optionChoice.upsert({
      where: {
        id: `00000000-0000-0000-0000-0000000000${40 + i}`,
      },
      update: {},
      create: {
        id: `00000000-0000-0000-0000-0000000000${40 + i}`,
        optionGroupId: optionGroup.id,
        name: sauce,
        priceModifier: 0,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
