import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDashboards, query, views } from "./build-dashboard.mjs";

test("distributed resource templates match the dashboard generator", () => {
  for (const [view, dashboard] of Object.entries(buildDashboards())) {
    const template = JSON.parse(readFileSync(new URL(`../resources/lps-${view}.json`, import.meta.url), "utf8"));
    assert.deepEqual(template, dashboard, `Regenerate resources/lps-${view}.json`);
  }
});

test("linked views share selectors and contain valid, nonoverlapping panels", () => {
  const dashboards = buildDashboards();
  assert.equal(Object.keys(dashboards).length, 6);
  for (const [view] of views) {
    const dashboard = dashboards[view];
    assert.equal(dashboard.uid, `lps-${view}`);
    assert.equal(dashboard.links.length, 6);
    assert.equal(new Set(dashboard.panels.map(panel => panel.id)).size, dashboard.panels.length);
    assert.deepEqual(dashboard.templating.list.map(variable => variable.name), ["datasource", "bucket", "plan_name", "round_name", "iteration_name", "target"]);
    for (const panel of dashboard.panels) {
      assert.ok(panel.gridPos.x + panel.gridPos.w <= 24);
      assert.ok(panel.targets[0].query.includes("${bucket:doublequote}"));
      for (const tag of ["plan_name", "round_name", "iteration_name", "target"])
        assert.ok(panel.targets[0].query.includes(`r.${tag} == \${${tag}:doublequote}`));
      for (const other of dashboard.panels.filter(other => other.id > panel.id)) {
        const first = panel.gridPos, second = other.gridPos;
        assert.ok(first.x + first.w <= second.x || second.x + second.w <= first.x || first.y + first.h <= second.y || second.y + second.h <= first.y, `${panel.title} overlaps ${other.title}`);
      }
    }
  }
});

test("cumulative tiles use final values, not sums of repeated snapshots", () => {
  for (const dashboard of Object.values(buildDashboards()))
    for (const panel of dashboard.panels.filter(panel => panel.type === "stat")) {
      assert.match(panel.targets[0].query, /\|> last\(\)/);
      assert.doesNotMatch(panel.targets[0].query, /\|> (sum|mean)\(/);
    }
});

test("percentiles remain endpoint-specific and watchdog annotations exclude batch cooldown", () => {
  for (const dashboard of Object.values(buildDashboards())) {
    assert.ok(dashboard.templating.list.slice(2).every(variable => !variable.multi && !variable.includeAll));
    assert.match(dashboard.annotations.list[0].target.query, /r.source == "Watchdog"/);
    assert.doesNotMatch(JSON.stringify(dashboard), /BatchCooldown|mean\(/);
    assert.equal(dashboard.panels.find(panel => panel.title === "Error rate").fieldConfig.defaults.unit, "percentunit");
    assert.ok(dashboard.panels.filter(panel => panel.type === "timeseries").every(panel => panel.fieldConfig.defaults.custom.spanNulls === false));
  }
});

test("windowed queries support origin-only export tags without broadening cumulative endpoint filters", () => {
  assert.match(query("windowed_requests", ["requests_count"]), /or r.target == targetOrigin/);
  assert.match(query("windowed_cooling", null), /regexp.replaceAllString/);
  assert.doesNotMatch(query("cumulative_requests", ["requests_count"]), /targetOrigin/);
});

test("summary renders string statuses, exact counts, and unrounded error percentages", () => {
  const panels = buildDashboards().requests.panels;
  assert.equal(panels.find(panel => panel.title === "Final status").options.reduceOptions.fields, "/^status$/");
  assert.equal(panels.find(panel => panel.title === "Total requests").fieldConfig.defaults.unit, "locale");
  const rate = panels.find(panel => panel.title === "Error rate").targets[0].query;
  assert.match(rate, /float\(v: r.failed_count\) \/ float\(v: r.requests_count\)/);
  assert.doesNotMatch(rate, /r._field == "error_rate"/);
});