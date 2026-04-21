import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const now = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        timestamp: now,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        status: "error",
        timestamp: now,
      },
      { status: 500 },
    );
  }
}
