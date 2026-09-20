import "dotenv/config";
import app from "./app";
import { startDispatchWorker } from "./modules/ride/dispatch.worker";
import { startRideMonitor } from "./modules/ride/ride-monitor.service";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  startDispatchWorker();
  startRideMonitor();
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down ride services`);
  server.close(error => {
    if (error) {
      console.error("HTTP server shutdown failed", error);
      process.exitCode = 1;
      return;
    }
    process.exit(0);
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
