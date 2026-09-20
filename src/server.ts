import "dotenv/config";
import app from "./app";
import { startDispatchWorker } from "./modules/ride/dispatch.worker";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  startDispatchWorker();
});
