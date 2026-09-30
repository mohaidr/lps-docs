import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const directory = dirname(fileURLToPath(import.meta.url));
const envPath = join(directory, ".env");
const values = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {
  LPS_INFLUX_PASSWORD: randomBytes(24).toString("hex"),
  LPS_INFLUX_ADMIN_TOKEN: randomBytes(32).toString("hex"),
  LPS_GRAFANA_PASSWORD: randomBytes(24).toString("hex"),
  LPS_INFLUX_READ_TOKEN: "pending",
  LPS_INFLUX_WRITE_TOKEN: "pending",
};
function saveEnvironment() {
  writeFileSync(envPath, `${Object.entries(values).map(([name, value]) => `${name}=${value}`).join("\n")}\n`, { mode: 0o600 });
}
function compose(service) {
  execFileSync("docker", ["compose", "--env-file", envPath, "-f", join(directory, "compose.yaml"), "up", "-d", "--pull", "never", "--wait", "--wait-timeout", "180", service], { cwd: directory, stdio: "inherit" });
}
async function influx(path, body) {
  const response = await fetch(`http://127.0.0.1:8087/api/v2/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Token ${values.LPS_INFLUX_ADMIN_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`InfluxDB setup failed (${response.status}).`);
  return response.json();
}

saveEnvironment();
execFileSync(process.execPath, [join(directory, "build-dashboard.mjs")], { stdio: "inherit" });
compose("influxdb");
const { orgs } = await influx("orgs?org=LPS");
const { buckets } = await influx("buckets?name=LPS_Metrics");
const organization = orgs[0], bucket = buckets[0];
if (!organization || !bucket) throw new Error("The local LPS organization or bucket is missing.");
for (const action of ["read", "write"]) {
  const name = `LPS_INFLUX_${action.toUpperCase()}_TOKEN`;
  if (values[name] && values[name] !== "pending") continue;
  const authorization = await influx("authorizations", {
    orgID: organization.id, description: `LPS local dashboard ${action}`,
    permissions: [{ action, resource: { type: "buckets", id: bucket.id, orgID: organization.id } }],
  });
  values[name] = authorization.token;
}
saveEnvironment();
compose("grafana");
const reload = await fetch("http://127.0.0.1:3300/api/admin/provisioning/dashboards/reload", {
  method: "POST",
  headers: { Authorization: `Basic ${Buffer.from(`lps:${values.LPS_GRAFANA_PASSWORD}`).toString("base64")}` },
  signal: AbortSignal.timeout(60_000),
});
if (!reload.ok) throw new Error(`Grafana dashboard provisioning failed (${reload.status}).`);
console.log("Grafana: http://127.0.0.1:3300/d/lps-requests");
console.log("InfluxDB: http://127.0.0.1:8087 (organization LPS, bucket LPS_Metrics)");
console.log("Generated local credentials are in grafana/.env; Grafana uses a bucket-scoped read-only token.");