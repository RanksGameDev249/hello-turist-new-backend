import { spawnSync } from "node:child_process";

const checks = [
  ["build", ["run", "build"]],
  ["security", ["exec", "tsx", "tests/security.middleware.test.ts"]],
];

let failed = false;
for (const [name, args] of checks) {
  console.log(`\n[QA] ${name}`);
  const result = spawnSync("npm", args as string[], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) failed = true;
}
if (failed) process.exit(1);
console.log("\n[QA] mandatory checks passed");
