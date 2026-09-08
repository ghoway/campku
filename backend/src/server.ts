import { serve } from "@hono/node-server";
import { env } from "@/config/env";
import app from "@/app";

const port = env.PORT || 8080;

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Camping Ground API running at http://localhost:${port}`);
console.log(`   Environment: ${env.NODE_ENV}`);
console.log(`   Health check: http://localhost:${port}/api/v1/health`);

// Start cron jobs
if (env.NODE_ENV !== "test") {
  import("@/jobs/worker").then(({ startJobs }) => startJobs()).catch((e) => {
    console.error("[jobs] failed to start:", e);
  });
}