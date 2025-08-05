import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Configure SSL handling for Docker environment
    if (process.env.DOCKER_BUILD === "1") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      console.log(
        "SSL certificate verification disabled for Docker environment",
      );
    }

    if (!IS_VERCEL_ENV) {
      // run DB migration
      const runMigrate = await import("./lib/db/pg/migrate.pg").then(
        (m) => m.runMigrate,
      );
      await runMigrate().catch((e) => {
        console.error(e);
        process.exit(1);
      });
    }

    const init = await import("./lib/ai/mcp/mcp-manager").then(
      (m) => m.initMCPManager,
    );
    await init();
  }
}
