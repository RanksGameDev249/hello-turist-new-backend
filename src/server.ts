import app from "./app";
import { startDispatchMonitoringWorker } from "./modules/ride/dispatch-expiry.worker";
import { startAutoDispatchWorker } from "./modules/ride/auto-dispatch.worker";
import { startSafetyMonitoringWorker } from "./modules/safety/safety-monitor.worker";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  startSafetyMonitoringWorker();
  startDispatchMonitoringWorker();
  startAutoDispatchWorker();
});
