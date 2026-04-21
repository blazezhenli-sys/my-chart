import fs from "fs";
import path from "path";

import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

function loadEnvFileIfNeeded() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  loadEnvFileIfNeeded();

  const prisma = new PrismaClient();

  const seedEmail = requireEnv("SEED_EMAIL").toLowerCase();
  const seedPassword = requireEnv("SEED_PASSWORD");

  const existingUsers = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  let user = existingUsers[0] ?? null;

  const passwordHash = await argon2.hash(seedPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: seedEmail,
        passwordHash,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: seedEmail,
        passwordHash,
      },
    });
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      preferredUnit: "C",
      disclaimerAcceptedAt: new Date(),
      tempRiseThresholdC: 0.2,
    },
    create: {
      userId: user.id,
      preferredUnit: "C",
      disclaimerAcceptedAt: new Date(),
      tempRiseThresholdC: 0.2,
    },
  });

  // Force fresh auth after credential changes.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.$disconnect();

  console.log("Account seed complete.");
  console.log(`Email: ${seedEmail}`);
  console.log("Password: [from SEED_PASSWORD]");
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
