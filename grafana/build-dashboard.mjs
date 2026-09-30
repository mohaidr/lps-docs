import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const views = [
  ["requests", "Requests"], ["latency", "Latency"], ["server", "Server Latency"],
  ["transfer", "Data Transfer"], ["responses", "Responses"], ["report", "Performance Report"],
];
const datasource = { type: "influxdb", uid: "${datasource}" };
const colors = { green: "#50d199", cyan: "#22d3ee", amber: "#f59e0b", red: "#f87171", blue: "#5794f2" };
const selectorTags = ["plan_name", "round_name", "iteration_name", "target"];

export function query(measurement, fields, extra = "") {
  const windowed = measurement.startsWith("windowed_");
  return `${windowed ? 'import "regexp"\ntargetOrigin = regexp.replaceAllString(r: /^(https?:\\/\\/[^\\/]+).*$/, v: ${target:doublequote}, t: "$1")\n' : ""}from(bucket: \${bucket:doublequote})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "${measurement}")
${selectorTags.map(tag => `  |> filter(fn: (r) => r.${tag} == \${${tag}:doublequote}${windowed && tag === "target" ? " or r.target == targetOrigin" : ""})`).join("\n")}
${fields?.length ? `  |> filter(fn: (r) => ${fields.map(field => `r._field == "${field}"`).join(" or ")})\n` : ""}${extra}`;
}

function latest(measurement, field, extra = "") {
  return query(measurement, [field], `${extra}  |> last()
  |> keep(columns: ["_time", "_value", "_field"])`);
}

function variables() {
  const labels = ["Run", "Round", "Iteration", "Target"];
  return [
    { name: "datasource", label: "Data source", type: "datasource", query: "influxdb", current: { text: "LPS InfluxDB", value: "lps-influxdb" }, refresh: 1, options: [] },
    { name: "bucket", label: "Bucket", type: "textbox", query: "LPS_Metrics", current: { text: "LPS_Metrics", value: "LPS_Metrics" }, options: [] },
    ...selectorTags.map((tag, index) => ({
      name: tag, label: labels[index], type: "query", datasource, refresh: 2, sort: index ? 1 : 2,
      multi: false, includeAll: false, options: [], current: {},
      query: `import "influxdata/influxdb/schema"
schema.tagValues(bucket: \${bucket:doublequote}, tag: "${tag}", start: v.timeRangeStart, stop: v.timeRangeStop,
  predicate: (r) => r._measurement == "cumulative_requests"${selectorTags.slice(0, index).map(parent => ` and r.${parent} == \${${parent}:doublequote}`).join("")})`,
    })),
  ];
}

const cooling = query("windowed_cooling", null, `  |> filter(fn: (r) => r.source == "Watchdog")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`);

export function buildDashboards() {
  const dashboards = {};
  for (const [view, label] of views) {
    let nextId = 0;
    function panel(title, type, flux, unit, position, defaults = {}, options = {}) {
      return {
        id: ++nextId, title, type, datasource, gridPos: position,
        targets: [{ refId: "A", datasource, query: flux }],
        fieldConfig: {
          defaults: { unit, noValue: "No data", color: { mode: "palette-classic" }, mappings: [], thresholds: { mode: "absolute", steps: [{ color: "green", value: null }] }, ...defaults },
          overrides: [],
        },
        options,
      };
    }
    function stat(title, flux, unit, index, color, defaults = {}) {
      return panel(title, "stat", flux, unit, { x: index % 4 * 6, y: Math.floor(index / 4) * 3, w: 6, h: 3 },
        { color: { mode: "fixed", fixedColor: color }, ...defaults },
        { colorMode: "value", graphMode: "none", textMode: "value", justifyMode: "auto", orientation: "horizontal", reduceOptions: { calcs: ["lastNotNull"], fields: unit === "string" ? "/^status$/" : "", values: false }, wideLayout: true });
    }
    function chart(title, flux, unit, position, overrides = []) {
      const result = panel(title, "timeseries", flux, unit, position, {
        custom: { drawStyle: "line", lineInterpolation: "linear", lineWidth: 2, fillOpacity: 8, showPoints: "never", spanNulls: false, axisBorderShow: false, axisColorMode: "text", axisPlacement: "auto", scaleDistribution: { type: "linear" }, stacking: { mode: "none", group: "A" }, hideFrom: { legend: false, tooltip: false, viz: false } },
      }, { tooltip: { mode: "multi", sort: "desc" }, legend: { displayMode: "table", placement: "bottom", calcs: ["lastNotNull", "max"], showLegend: true } });
      result.fieldConfig.overrides = overrides;
      return result;
    }
    function series(measurement, fields, extra = "") {
      return query(measurement, fields, `${extra}  |> keep(columns: ["_time", "_value", "_field", "metric", "status_code"])`);
    }
    function named(field, name, color) {
      return { matcher: { id: "byName", options: field }, properties: [{ id: "displayName", value: name }, ...(color ? [{ id: "color", value: { mode: "fixed", fixedColor: color } }] : [])] };
    }
    const timingFilter = '  |> filter(fn: (r) => r.metric == "total_time")\n';
    const errorRate = query("cumulative_requests", ["requests_count", "failed_count"], `  |> last()
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({_time: r._time, _field: "error_rate", _value: if r.requests_count > 0 then float(v: r.failed_count) / float(v: r.requests_count) else 0.0}))`);
    const panels = [
      stat("Total requests", latest("cumulative_requests", "requests_count"), "locale", 0, colors.cyan, { decimals: 0 }),
      stat("Average response", latest("cumulative_duration", "avg", timingFilter), "ms", 1, colors.cyan, { decimals: 2 }),
      stat("Successful", latest("cumulative_requests", "successful_count"), "locale", 2, colors.green, { decimals: 0 }),
      stat("Failed", latest("cumulative_requests", "failed_count"), "locale", 3, colors.red, { decimals: 0 }),
      stat("Error rate", errorRate, "percentunit", 4, colors.red, { decimals: 2, min: 0, max: 1 }),
      stat("Received", latest("cumulative_data_transfer", "data_received"), "bytes", 5, colors.cyan),
      stat("Peak concurrency", latest("cumulative_requests", "max_concurrent_requests"), "locale", 6, colors.amber, { decimals: 0 }),
      stat("Final status", latest("iteration_final_status", "status"), "string", 7, colors.green, {
        noValue: "Not finalized",
        mappings: [{ type: "value", options: Object.fromEntries(["Success", "Completed", "Failed", "Cancelled", "Terminated", "Skipped"].map(status => [status, { text: status, color: ["Success", "Completed"].includes(status) ? colors.green : ["Failed", "Terminated"].includes(status) ? colors.red : colors.amber }])) }],
      }),
    ];
    const requests = [named("requests_count", "Sent", colors.cyan), named("successful_count", "Successful", colors.green), named("failed_count", "Failed", colors.red), named("skipped_count", "Skipped", colors.amber)];
    const bandwidth = [named("upstream_bps", "Upload", colors.cyan), named("downstream_bps", "Download", colors.green), named("total_bps", "Total", colors.blue)];
    if (view === "requests") {
      panels.push(chart("Requests per window", series("windowed_requests", ["requests_count", "successful_count", "failed_count", "skipped_count"]), "short", { x: 0, y: 4, w: 24, h: 8 }, requests));
      panels.push(chart("Request rate per second", series("windowed_requests", ["requests_per_second"]), "reqps", { x: 0, y: 12, w: 16, h: 8 }, [named("requests_per_second", "Requests / s", colors.cyan)]));
      panels.push(chart("Concurrent requests", series("windowed_requests", ["max_concurrent_requests"]), "short", { x: 16, y: 12, w: 8, h: 8 }, [named("max_concurrent_requests", "Concurrent", colors.amber)]));
      panels.push(panel("Traffic activity", "state-timeline", series("windowed_requests", ["is_idle"]), "none", { x: 0, y: 20, w: 24, h: 4 }, {
        mappings: [{ type: "value", options: { true: { text: "Idle", color: "dark-gray" }, false: { text: "Active", color: colors.green } } }],
      }, { mergeValues: true, rowHeight: 0.8, showValue: "never", tooltip: { mode: "single" }, legend: { showLegend: true, displayMode: "list", placement: "bottom" } }));
      panels.push(panel("Watchdog intervals", "table", `${cooling}
  |> map(fn: (r) => ({Start: time(v: r.start_ns), End: time(v: r.end_ns), Machine: if exists r.machine then r.machine else "Local / legacy", Node: if exists r.node then r.node else "", Reason: if exists r.reason then r.reason else "Resource pressure", Duration: r.duration_ms}))
  |> group()
  |> sort(columns: ["Start"], desc: true)`, "none", { x: 0, y: 24, w: 24, h: 7 }, {}, { showHeader: true, cellHeight: "sm", footer: { show: false } }));
      panels.at(-1).fieldConfig.overrides = [{ matcher: { id: "byName", options: "Duration" }, properties: [{ id: "unit", value: "ms" }] }];
    }
    if (view === "latency") {
      for (const [index, kind] of ["windowed", "cumulative"].entries())
        panels.push(chart(`${index ? "Cumulative" : "Windowed"} response time`, series(`${kind}_duration`, ["avg", "p50", "p90", "p95", "p99", "max"], timingFilter), "ms", { x: 0, y: 4 + index * 9, w: 24, h: 9 }, [named("avg", "Average", colors.green), named("p50", "P50", colors.cyan), named("p90", "P90", colors.blue), named("p95", "P95", colors.amber), named("p99", "P99", colors.red), named("max", "Maximum", "#B877D9")]));
      panels.push(chart("Request timing breakdown", series("windowed_duration", ["avg"], '  |> filter(fn: (r) => r.metric != "total_time" and r.metric !~ /^server_time/)\n'), "ms", { x: 0, y: 22, w: 24, h: 8 }));
    }
    if (view === "server") {
      panels.push(chart("Server processing time", series("windowed_duration", ["avg", "p95", "p99"], '  |> filter(fn: (r) => r.metric == "server_time")\n'), "ms", { x: 0, y: 4, w: 24, h: 10 }, [named("avg", "Average", colors.green), named("p95", "P95", colors.amber), named("p99", "P99", colors.red)]));
      panels.push(chart("Server components", series("windowed_duration", ["avg"], '  |> filter(fn: (r) => r.metric == "server_time_db" or r.metric == "server_time_cache" or r.metric == "server_time_app")\n'), "ms", { x: 0, y: 14, w: 24, h: 9 }));
    }
    if (view === "transfer") {
      panels.push(chart("Bytes per window", series("windowed_data_transfer", ["data_sent", "data_received"]), "bytes", { x: 0, y: 4, w: 24, h: 8 }, [named("data_sent", "Sent", colors.cyan), named("data_received", "Received", colors.green)]));
      panels.push(chart("Windowed bandwidth", series("windowed_data_transfer", ["upstream_bps", "downstream_bps", "total_bps"]), "Bps", { x: 0, y: 12, w: 12, h: 8 }, bandwidth));
      panels.push(chart("Cumulative average bandwidth", series("cumulative_data_transfer", ["upstream_bps", "downstream_bps", "total_bps"]), "Bps", { x: 12, y: 12, w: 12, h: 8 }, bandwidth));
    }
    if (view === "responses") {
      panels.push(chart("HTTP responses per window", series("windowed_response_codes", ["count"]), "short", { x: 0, y: 4, w: 24, h: 9 }));
      const responses = query("cumulative_response_codes", ["count"], `  |> last()
  |> keep(columns: ["status_code", "status_reason", "_value"])
  |> group()
  |> rename(columns: {status_code: "Code", status_reason: "Response", _value: "Count"})
  |> sort(columns: ["Code"])`);
      panels.push(panel("Response distribution", "piechart", responses, "short", { x: 0, y: 13, w: 10, h: 9 }, {}, { pieType: "donut", displayLabels: ["name", "percent"], reduceOptions: { values: true, fields: "/Count/", calcs: ["lastNotNull"] }, legend: { displayMode: "table", placement: "bottom", showLegend: true, values: ["value", "percent"] }, tooltip: { mode: "single" } }));
      panels.push(panel("HTTP response totals", "table", responses, "none", { x: 10, y: 13, w: 14, h: 9 }, {}, { showHeader: true, cellHeight: "sm" }));
    }
    if (view === "report") {
      panels.push(panel("Timing report", "table", query("cumulative_duration", ["min", "avg", "p50", "p90", "p95", "p99", "max"], `  |> last()
  |> group()
  |> pivot(rowKey: ["metric"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["metric", "min", "avg", "p50", "p90", "p95", "p99", "max"])
  |> sort(columns: ["metric"])`), "ms", { x: 0, y: 4, w: 24, h: 11 }, { decimals: 2 }, { showHeader: true, cellHeight: "sm" }));
      panels.push(panel("Request totals", "table", query("cumulative_requests", ["requests_count", "successful_count", "failed_count", "skipped_count", "max_concurrent_requests"], `  |> last()
  |> group()
  |> keep(columns: ["_field", "_value"])
  |> rename(columns: {_field: "Metric", _value: "Count"})`), "short", { x: 0, y: 15, w: 12, h: 8 }, { decimals: 0 }, { showHeader: true, cellHeight: "sm" }));
      panels.push(panel("Transfer totals", "table", query("cumulative_data_transfer", ["data_sent", "data_received", "avg_data_sent", "avg_data_received"], `  |> last()
  |> group()
  |> keep(columns: ["_field", "_value"])
  |> rename(columns: {_field: "Metric", _value: "Bytes"})`), "bytes", { x: 12, y: 15, w: 12, h: 8 }, {}, { showHeader: true, cellHeight: "sm" }));
    }
    for (const item of panels.filter(item => item.type !== "stat")) item.gridPos.y += 2;
    dashboards[view] = {
      id: null, uid: `lps-${view}`, title: `LPS / ${label}`, tags: ["LPS", "Performance"], timezone: "browser",
      schemaVersion: 39, version: 1, editable: true, graphTooltip: 1, refresh: "5s",
      time: { from: "now-30m", to: "now" }, timepicker: { refresh_intervals: ["5s", "10s", "30s", "1m"] },
      links: views.map(([key, title]) => ({ title, type: "link", url: `/d/lps-${key}`, includeVars: true, keepTime: true, targetBlank: false, asDropdown: false })),
      templating: { list: variables() }, panels,
      annotations: { list: [{ name: "Watchdog cooling", datasource, enable: true, hide: false, iconColor: colors.amber, target: { refId: "Cooling", query: `${cooling}
  |> map(fn: (r) => ({_time: time(v: r.start_ns), timeEnd: time(v: r.end_ns), text: (if exists r.machine then r.machine else "Local / legacy") + " | " + (if exists r.node then r.node else "") + " | " + (if exists r.reason then r.reason else "Resource pressure"), tags: "Watchdog"}))
  |> group()
  |> keep(columns: ["_time", "timeEnd", "text", "tags"])` } }] },
    };
  }
  return dashboards;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = join(dirname(fileURLToPath(import.meta.url)), "..", "resources");
  for (const [view, dashboard] of Object.entries(buildDashboards())) {
    const destination = join(directory, `lps-${view}.json`);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, `${JSON.stringify(dashboard, null, 2)}\n`);
  }
  console.log("Built six linked LPS Grafana views.");
}