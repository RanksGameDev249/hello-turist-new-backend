import fs from "node:fs";
import path from "node:path";

const file = path.resolve("prisma/schema.prisma");
let source = fs.readFileSync(file, "utf8");

const replacements = [
  [
    "enum RideStatus {\n  REQUESTED\n  SEARCHING\n  ASSIGNED\n  DRIVER_ARRIVING\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED",
    "enum RideStatus {\n  REQUESTED\n  SEARCHING\n  ASSIGNED\n  DRIVER_ARRIVING\n  IN_PROGRESS\n  INTERRUPTED\n  COMPLETED\n  CANCELLED",
  ],
  [
    "enum RideEventType {\n  CREATED\n  SEARCH_STARTED\n  DRIVER_ASSIGNED\n  DRIVER_ACCEPTED\n  DRIVER_REJECTED\n  DRIVER_ARRIVING\n  RIDE_STARTED\n  RIDE_COMPLETED\n  CANCELLED\n  LOCATION_RECORDED",
    "enum RideEventType {\n  CREATED\n  SEARCH_STARTED\n  DRIVER_ASSIGNED\n  DRIVER_ACCEPTED\n  DRIVER_REJECTED\n  DRIVER_ARRIVING\n  RIDE_STARTED\n  RIDE_COMPLETED\n  CANCELLED\n  LOCATION_RECORDED\n  INTERRUPTED",
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`Expected schema anchor not found: ${from.split("\n")[0]}`);
  source = source.replace(from, to);
}

fs.writeFileSync(file, source.endsWith("\n") ? source : `${source}\n`);
console.log("Recovery enum changes applied to prisma/schema.prisma");
