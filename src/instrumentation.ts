export async function register() {
  // Once per server instance: auto-seed an empty database, then start the
  // background job worker. Skip during build and in the edge bundle.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.DATABASE_URL
  ) {
    const { prisma } = await import("@/server/db");
    const { seedDemoIfEmpty } = await import("@/server/seed-demo");
    await seedDemoIfEmpty(prisma).catch((error) => {
      console.error("[bootstrap] demo seed failed:", error);
    });

    const { startWorker } = await import("@/server/jobs/worker");
    startWorker();
  }
}
