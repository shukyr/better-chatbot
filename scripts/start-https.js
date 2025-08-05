import { createServer } from "https";
import { createServer as createHttpServer } from "http";
import { parse } from "url";
import next from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if HTTPS should be disabled
const useHttps = process.env.NO_HTTPS !== "1";

// Force production mode in Docker, but allow dev mode locally
const dev = process.env.NODE_ENV !== "production" && !process.env.DOCKER_BUILD;
const hostname = "0.0.0.0"; // Listen on all interfaces
const port = process.env.HTTPS_PORT || 3000; // Default port for Next.js in Docker

// Construct public URL properly
const protocol = useHttps ? "https" : "http";
const publicUrl =
  process.env.BETTER_AUTH_URL || `${protocol}://localhost:${port}`;

console.log(`${useHttps ? "HTTPS" : "HTTP"} Server Configuration:`);
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log("- DOCKER_BUILD:", process.env.DOCKER_BUILD);
console.log("- NO_HTTPS:", process.env.NO_HTTPS);
console.log("- Use HTTPS:", useHttps);
console.log("- Development mode:", dev);
console.log("- Port:", port);
console.log("- Public URL:", publicUrl);
console.log("- BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
console.log(
  "- NODE_TLS_REJECT_UNAUTHORIZED:",
  process.env.NODE_TLS_REJECT_UNAUTHORIZED,
);

// Configure Node.js to handle self-signed certificates in Docker
if (process.env.DOCKER_BUILD) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.log("- Disabled TLS certificate verification for Docker environment");
}

// Load SSL certificates with error handling (only if HTTPS is enabled)
let httpsOptions;
if (useHttps) {
  try {
    const keyPath = path.join(__dirname, "../ssl/server.key");
    const certPath = path.join(__dirname, "../ssl/server.crt");

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error(
        `SSL certificates not found at ${keyPath} or ${certPath}`,
      );
    }

    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } catch (error) {
    console.error("Failed to load SSL certificates:", error.message);
    console.log(
      "Tip: You can disable HTTPS by setting NO_HTTPS=1 environment variable",
    );
    process.exit(1);
  }
}

// Create Next.js app with proper configuration
const app = next({
  dev,
  hostname,
  port: 3000, // Internal Next.js port
  conf: {
    poweredByHeader: false,
    generateEtags: false,
  },
});
const handle = app.getRequestHandler();

console.log(
  `Starting Next.js app in ${dev ? "development" : "production"} mode...`,
);

app
  .prepare()
  .then(() => {
    const requestHandler = async (req, res) => {
      try {
        // Add security headers
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-XSS-Protection", "1; mode=block");

        // Parse the URL
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling", req.url, err);
        res.statusCode = 500;
        res.end("Internal server error");
      }
    };

    // Create server based on HTTPS configuration
    const server = useHttps
      ? createServer(httpsOptions, requestHandler)
      : createHttpServer(requestHandler);

    server
      .once("error", (err) => {
        console.error(`${useHttps ? "HTTPS" : "HTTP"} Server error:`, err);
        process.exit(1);
      })
      .listen(port, hostname, () => {
        console.log(
          `> ${useHttps ? "HTTPS" : "HTTP"} Server ready on ${publicUrl}`,
        );
        console.log(`> Listening on ${hostname}:${port}`);
      });
  })
  .catch((err) => {
    console.error("Failed to prepare Next.js app:", err);
    process.exit(1);
  });
