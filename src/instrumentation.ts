export async function register() {
  // Start the background job worker once per server instance.
  // Skip during build and in the edge bundle.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.DATABASE_URL
  ) {
    const { startWorker } = await import("@/server/jobs/worker");
    startWorker();
  }
}
