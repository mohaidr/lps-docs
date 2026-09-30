import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { createWriteStream, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { buildDashboards } from "./build-dashboard.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const privateDirectory = join(directory, ".local");
mkdirSync(privateDirectory, { recursive: true });
const credentials = parseEnv(readFileSync(join(directory, ".env"), "utf8"));
const dashboards = buildDashboards();
const range = { from: String(Date.now() - 30 * 60_000), to: String(Date.now() + 60_000) };
const selection = { datasource: "lps-influxdb", bucket: "LPS_Metrics", plan_name: `Dashboard Fixture_${new Date().toISOString().replace(/[:.]/g, "-")}`, round_name: "Baseline", iteration_name: "Catalog", target: "http://127.0.0.1:18211/products?view=compact" };

async function request(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).pathname}: ${(await response.text()).slice(0, 1000)}`);
  return response;
}
function interpolate(flux, values = selection) {
  return flux.replace(/\$\{([\w]+):doublequote\}/g, (_, name) => JSON.stringify(values[name]));
}
async function grafanaQuery(flux, values = selection) {
  const response = await request("http://127.0.0.1:3300/api/ds/query", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...range, queries: [{ refId: "A", datasource: { type: "influxdb", uid: "lps-influxdb" }, query: interpolate(flux, values), maxDataPoints: 2000, intervalMs: 10_000 }] }),
  });
  const result = (await response.json()).results.A;
  if (result.error) throw new Error(result.error);
  return result.frames || [];
}
function valuesOf(frames, type) {
  return frames.flatMap(frame => frame.schema.fields.flatMap((field, index) => field.type === type ? frame.data.values[index] : []));
}
function tag(value) { return String(value).replaceAll(" ", "\\ ").replaceAll(",", "\\,").replaceAll("=", "\\="); }
function commonTags(target) {
  return Object.entries({ ...selection, target }).filter(([name]) => ["plan_name", "round_name", "iteration_name", "target"].includes(name)).map(([name, value]) => `${name}=${tag(value)}`).join(",");
}
const tags = commonTags(selection.target);
const windowTags = commonTags(new URL(selection.target).origin);
const lines = [];
function line(measurement, fields, timestamp, additional = "", common = measurement.startsWith("windowed_") ? windowTags : tags) {
  lines.push(`${measurement},${common}${additional} ${fields} ${BigInt(timestamp) * 1_000_000n}`);
}
function timing(average, count) {
  return `sum=${(average * count).toFixed(2)},avg=${average.toFixed(2)},min=${(average * 0.4).toFixed(2)},max=${(average * 2.5).toFixed(2)},p50=${(average * 0.9).toFixed(2)},p90=${(average * 1.4).toFixed(2)},p95=${(average * 1.7).toFixed(2)},p99=${(average * 2).toFixed(2)}`;
}

const start = Date.now() - 14 * 60_000;
let total = 0, failed = 0, skipped = 0;
const codes = { 200: 0, 429: 0, 503: 0 };
for (let index = 0; index < 72; index++) {
  const idle = index === 30 || index === 31;
  const cooling = index >= 42 && index <= 46;
  const count = idle ? 0 : cooling ? 5 : 25 + Math.round(8 * Math.sin(index / 5));
  const errors = !idle && (index % 11 === 0 || cooling) ? 2 : 0;
  const status = index % 2 ? 429 : 503;
  const skip = index % 13 === 0 ? 1 : 0;
  const timestamp = start + (index + 1) * 10_000;
  total += count; failed += errors; skipped += skip;
  codes[200] += count - errors; codes[status] += errors;
  line("windowed_requests", `requests_count=${count}i,successful_count=${count - errors}i,failed_count=${errors}i,skipped_count=${skip}i,max_concurrent_requests=${idle ? 0 : 8}i,requests_per_second=${count / 10},window_duration_ms=10000.0,is_idle=${idle}`, timestamp);
  line("cumulative_requests", `requests_count=${total}i,successful_count=${total - failed}i,failed_count=${failed}i,skipped_count=${skipped}i,max_concurrent_requests=8i,requests_per_second=${total / ((index + 1) * 10)},requests_rate_per_cooldown=0.0,error_rate=${failed / total},time_elapsed_ms=${(index + 1) * 10_000}.0`, timestamp);
  line("windowed_data_transfer", `data_sent=${count * 100}.0,data_received=${count * 512}.0,upstream_bps=${count * 10}.0,downstream_bps=${count * 51.2},total_bps=${count * 61.2}`, timestamp);
  line("cumulative_data_transfer", `data_sent=${total * 100}.0,data_received=${total * 512}.0,avg_data_sent=100.0,avg_data_received=512.0,upstream_bps=${total * 100 / ((index + 1) * 10)},downstream_bps=${total * 512 / ((index + 1) * 10)},total_bps=${total * 612 / ((index + 1) * 10)}`, timestamp);
  const average = cooling ? 210 : 40 + 8 * Math.sin(index / 6);
  for (const [metric, factor] of Object.entries({ total_time: 1, tcp_handshake: .04, ssl_handshake: .06, time_to_first_byte: .5, waiting_time: .35, sending_time: .02, receiving_time: .13, server_time: .4, server_time_db: .16, server_time_cache: .04, server_time_app: .2 })) {
    if (!idle) line("windowed_duration", timing(average * factor, count), timestamp, `,metric=${metric}`);
    line("cumulative_duration", timing(45 * factor, total), timestamp, `,metric=${metric}`);
  }
  for (const [code, reason] of [[200, "OK"], [429, "Too Many Requests"], [503, "Service Unavailable"]]) {
    line("windowed_response_codes", `count=${code === 200 ? count - errors : code === status ? errors : 0}i`, timestamp, `,status_code=${code},status_reason=${tag(reason)}`);
    line("cumulative_response_codes", `count=${codes[code]}i`, timestamp, `,status_code=${code},status_reason=${tag(reason)}`);
  }
}
line("iteration_final_status", 'status="Success"', start + 720_000);
for (const [machine, node, offset, reason] of [["load-01", "192.0.2.11", 0, "CPU at/above 80% limit"], ["load-02", "192.0.2.12", 5000, "Memory above 5000 MB limit"]]) {
  const begin = start + 420_000 + offset, end = start + 470_000 + offset;
  line("windowed_cooling", `start_ns=${BigInt(begin) * 1_000_000n}i,end_ns=${BigInt(end) * 1_000_000n}i,duration_ms=${end - begin}.0`, end, `,source=Watchdog,node=${node},machine=${machine},reason=${tag(reason)}`);
}
line("windowed_cooling", `start_ns=${BigInt(start) * 1_000_000n}i,end_ns=${BigInt(start + 1000) * 1_000_000n}i,duration_ms=1000.0`, start + 1000, ",source=BatchCooldown,machine=hidden-batch");
line("cumulative_requests", "requests_count=999999i,error_rate=1.0", start + 721_000, "", tags.replace("round_name=Baseline", "round_name=Other"));

await request("http://127.0.0.1:8087/api/v2/write?org=LPS&bucket=LPS_Metrics&precision=ns", { method: "POST", headers: { Authorization: `Token ${credentials.LPS_INFLUX_WRITE_TOKEN}`, "Content-Type": "text/plain" }, body: lines.join("\n") });
const denied = await fetch("http://127.0.0.1:8087/api/v2/write?org=LPS&bucket=LPS_Metrics&precision=ns", { method: "POST", headers: { Authorization: `Token ${credentials.LPS_INFLUX_READ_TOKEN}` }, body: "permission_probe value=1i" });
assert.equal(denied.status, 403, "Grafana's token must not permit writes");

const cache = new Map();
async function checked(flux) {
  if (!cache.has(flux)) cache.set(flux, await grafanaQuery(flux));
  const frames = cache.get(flux);
  assert.ok(frames.length && frames.some(frame => frame.data.values.some(column => column.length)), "Query returned no data");
  return frames;
}
for (const [view, dashboard] of Object.entries(dashboards)) {
  const loaded = await (await request(`http://127.0.0.1:3300/api/dashboards/uid/${dashboard.uid}`)).json();
  assert.equal(loaded.dashboard.panels.length, dashboard.panels.length, `${view} provisioning`);
  for (const panel of dashboard.panels) {
    try { await checked(panel.targets[0].query); }
    catch (error) { throw new Error(`${view} / ${panel.title}: ${error.message}`); }
  }
  console.log(`${dashboard.title}: ${dashboard.panels.length} panels returned data.`);
}
for (const variable of dashboards.requests.templating.list.filter(variable => variable.type === "query")) {
  const frames = await checked(variable.query);
  assert.ok(valuesOf(frames, "string").includes(selection[variable.name]), `Missing selector value: ${variable.name}`);
}
const expectedStats = { "Total requests": total, "Average response": 45, Successful: total - failed, Failed: failed, "Error rate": failed / total, Received: total * 512, "Peak concurrency": 8 };
for (const [title, expected] of Object.entries(expectedStats)) {
  const panel = dashboards.requests.panels.find(panel => panel.title === title);
  const actual = valuesOf(await checked(panel.targets[0].query), "number");
  assert.ok(actual.some(value => Math.abs(value - expected) < 0.000001), `${title}: expected ${expected}, received ${JSON.stringify(actual)}`);
}
const annotations = await checked(dashboards.requests.annotations.list[0].target.query);
assert.ok(annotations.some(frame => frame.schema.fields.some(field => field.name === "timeEnd" && field.type === "time")), "Cooling interval end must be a timestamp");
const annotationText = valuesOf(annotations, "string").join(" ");
assert.match(annotationText, /load-01/);
assert.match(annotationText, /load-02/);
assert.doesNotMatch(annotationText, /hidden-batch/);

async function availablePort() {
  const server = createTcpServer();
  await new Promise((resolveReady, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveReady); });
  const port = server.address().port;
  await new Promise(resolveClosed => server.close(resolveClosed));
  return port;
}
async function runLps(runner) {
  let requests = 0;
  const server = createServer(async (incoming, outgoing) => {
    if (incoming.url !== "/catalog") {
      outgoing.writeHead(200, { "Content-Type": "text/plain" });
      outgoing.end("ready");
      return;
    }
    requests++;
    outgoing.statusCode = requests % 10 === 0 ? 503 : 200;
    outgoing.setHeader("Content-Type", "application/json");
    outgoing.setHeader("Server-Timing", "total;dur=150, db;dur=20, cache;dur=5, app;dur=125");
    const body = JSON.stringify({ request: requests, payload: "local-verification".repeat(16) });
    outgoing.setHeader("Content-Length", Buffer.byteLength(body));
    setTimeout(() => outgoing.end(body), 150);
  });
  await new Promise(resolveReady => server.listen(0, "127.0.0.1", resolveReady));
  const target = `http://127.0.0.1:${server.address().port}/catalog`;
  const runDirectory = join(privateDirectory, `run-${Date.now()}`);
  mkdirSync(runDirectory, { recursive: true });
  const settings = JSON.parse(readFileSync(join(dirname(runner), "config", "lpsSettings.json"), "utf8"));
  const app = settings.LPSAppSettings;
  app.Dashboard = { BuiltInDashboard: false, Port: await availablePort(), RefreshRate: 1 };
  app.Cluster = { MasterNodeIP: "127.0.0.1", GRPCPort: await availablePort(), ExpectedNumberOfWorkers: 0, MasterNodeIsWorker: true };
  app.InfluxDB = { Enabled: true, Url: "http://127.0.0.1:8087", Token: credentials.LPS_INFLUX_WRITE_TOKEN, Organization: "LPS", Bucket: "LPS_Metrics" };
  app.HttpClient.ServerTimeHeader = "Server-Timing";
  app.HttpClient.ServerTimeFormat = "ServerTiming";
  app.FileLogger.ConsoleLogingLevel = 2;
  app.FileLogger.DisableFileLogging = true;
  const settingsPath = join(runDirectory, "lpsSettings.json");
  writeFileSync(settingsPath, JSON.stringify(settings), { mode: 0o600 });
  const planPath = join(runDirectory, "plan.json");
  writeFileSync(planPath, JSON.stringify({ name: "Grafana Live Verification", rounds: [{ name: "Local", numberOfClients: "1", arrivalDelay: "0", runInParallel: "false", iterations: [{ name: "Catalog", mode: "R", requestCount: "60", failureRules: [{ metric: "ErrorRate > 0.05", errorStatusCodes: ">= 500" }], httpRequest: { url: target, httpMethod: "GET", httpVersion: "1.1" } }] }] }));
  const output = createWriteStream(join(runDirectory, "runner.log"));
  try {
    const child = spawn("dotnet", [runner, "run", planPath], { cwd: runDirectory, env: { ...process.env, LPS_SETTINGS_FILE: settingsPath, LPS_WORKSPACE_RUN: runDirectory, NO_COLOR: "1" }, stdio: ["pipe", "pipe", "pipe"], timeout: 120_000 });
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    const exit = await new Promise((resolveExit, reject) => { child.once("error", reject); child.once("close", resolveExit); });
    assert.equal(exit, 1, `The intentional failure rule should fail this run; see ${join(runDirectory, "runner.log")}`);
    const metricsDirectory = join(runDirectory, "Metrics");
    const throughputFile = readdirSync(metricsDirectory, { recursive: true }).find(name => name.endsWith("Catalog_Throughput.json"));
    assert.ok(throughputFile, "LPS did not retain throughput metrics");
    const final = JSON.parse(readFileSync(join(metricsDirectory, throughputFile), "utf8")).at(-1);
    assert.equal(final.IsFinal, true);
    assert.equal(final.ExecutionStatus, "Failed");
    assert.deepEqual([final.Metric.RequestsCount, final.Metric.SuccessfulRequestCount, final.Metric.FailedRequestsCount], [60, 54, 6]);
    assert.ok(requests >= 60 && requests <= 61, "Unexpected local target traffic beyond the measured requests and validation probe");
  } finally {
    output.end();
    server.closeAllConnections();
    await new Promise(resolveClosed => server.close(resolveClosed));
  }
  range.to = String(Date.now() + 60_000);
  const planValues = valuesOf(await grafanaQuery(dashboards.requests.templating.list.find(variable => variable.name === "plan_name").query), "string");
  const plan = planValues.filter(value => value.startsWith("Grafana Live Verification_")).sort().at(-1);
  assert.ok(plan, "The real LPS run did not export a plan tag");
  const live = { ...selection, plan_name: plan, round_name: "Local", iteration_name: "Catalog", target };
  for (const [title, expected] of [["Total requests", 60], ["Successful", 54], ["Failed", 6]]) {
    const panel = dashboards.requests.panels.find(panel => panel.title === title);
    assert.ok(valuesOf(await grafanaQuery(panel.targets[0].query, live), "number").includes(expected), `Real LPS ${title} mismatch`);
  }
  const rate = dashboards.requests.panels.find(panel => panel.title === "Request rate per second");
  assert.ok(valuesOf(await grafanaQuery(rate.targets[0].query, live), "number").some(value => value > 0), "Real LPS windowed request rate is missing");
  const status = dashboards.requests.panels.find(panel => panel.title === "Final status");
  assert.ok(valuesOf(await grafanaQuery(status.targets[0].query, live), "string").includes("Failed"), "Real LPS final status mismatch");
  console.log("Real LPS export: 60 loopback requests, 54 successful, 6 failed; cumulative and windowed queries verified.");
  return live;
}

const runnerIndex = process.argv.indexOf("--runner");
const live = runnerIndex >= 0 ? await runLps(resolve(process.argv[runnerIndex + 1])) : null;
const url = new URL("http://127.0.0.1:3300/d/lps-requests");
for (const [name, value] of Object.entries(selection)) url.searchParams.set(`var-${name}`, value);
url.searchParams.set("from", range.from);
url.searchParams.set("to", range.to);
const report = { verifiedAt: new Date().toISOString(), fixture: selection, live, uniqueQueries: cache.size, expectedStats, previewUrl: url.href, range };
writeFileSync(join(privateDirectory, "verification.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Verified ${cache.size} distinct Grafana queries, all selectors, exact summary values, watchdog metadata, and read-only access.`);
console.log(url.href);