# InfluxDB Integration

For dashboard imports, LPS configuration, and access from other devices, see
[Integrating LPS with Grafana](../grafana-integration.md). The six importable
dashboard templates are in [resources](../resources/).

The **LPS Tool** supports InfluxDB integration starting from version **3.0.3.1** and above. This feature allows you to automatically export performance testing metrics to your InfluxDB instance for advanced analytics, long-term storage, and visualization using tools like Grafana.

## Overview

InfluxDB is a time-series database designed for handling high write and query workloads. By integrating LPS with InfluxDB, you can:

- **Store Historical Data**: Keep performance metrics for trend analysis and historical comparisons
- **Advanced Visualization**: Use Grafana or other tools to create custom dashboards and alerts
- **Data Analysis**: Perform complex queries on your performance data
- **Integration**: Combine LPS metrics with other monitoring systems
- **Scalability**: Handle large volumes of metrics data efficiently

## Prerequisites

Before configuring InfluxDB integration, ensure you have:

1. **LPS Tool version 3.0.3.1 or higher**
2. **InfluxDB instance** (local, cloud, or enterprise)
3. **InfluxDB authentication token** with write permissions
4. **Organization and bucket** configured in InfluxDB


## Local Grafana Workspace

The dashboard mirrors the built-in LPS views with shared summary tiles and linked
Requests, Latency, Server Latency, Data Transfer, Responses, and Performance Report
pages. Navigation retains the selected run, round, iteration, endpoint, and time range.

With Docker Desktop, Node.js 22.12 or later, and the `influxdb:2.7` and
`grafana/grafana:latest` images installed, run from this directory:

```powershell
node start-local.mjs
```

- Grafana: http://127.0.0.1:3300/d/lps-requests
- InfluxDB: http://127.0.0.1:8087
- Organization: `LPS`; bucket: `LPS_Metrics`.
- Credentials are generated in the Git-ignored `.env` file. Admin username is
  `lps`; password keys are `LPS_GRAFANA_PASSWORD` and `LPS_INFLUX_PASSWORD`.
- Grafana has anonymous **Viewer** access on localhost and a bucket-scoped
  **read-only** token. The generated `LPS_INFLUX_WRITE_TOKEN` is for LPS export.
- Containers and named volumes belong to the separate `lps-grafana` Compose
  project. Existing Grafana/InfluxDB containers and volumes are not changed.
- Data retention is seven days in this local test stack. Keep `.env` with its
  volumes; do not regenerate credentials against existing initialized volumes.

In LPS Settings, enable InfluxDB with the URL, organization, and bucket above,
and enter the write token locally. Settings apply to future runs. An LPS process
inside another container must use a network-reachable InfluxDB URL instead of
its own `127.0.0.1`.

Stop without deleting stored data:

```powershell
docker compose stop
```

### Verification

```powershell
node --test dashboard.test.mjs
node verify-local.mjs --runner C:/path/to/LPS.dll
```

The verifier writes an explicitly named `Dashboard Fixture` run, tests every panel
query through Grafana, checks exact summary values, selector isolation, idle data,
two watchdog machines, and read-only permissions. With `--runner`, it also runs
60 requests against an ephemeral loopback HTTP server and compares Grafana with
retained LPS metrics: 54 successful and 6 intentional HTTP 503 failures. The test
rule intentionally yields `Failed`. No external load target is contacted.

The private `.local/verification.json` report contains a time-bounded fixture URL
and real-run selectors. Fixture cooling and server timing are synthetic; the
real-run counters and status are exported by LPS. Without `--runner`, only the
fixture/query checks run. Repeated verification adds separately named fixture runs.

### Data Semantics

- Summary tiles use the latest cumulative snapshot in the selected time range,
  never the sum of repeated cumulative snapshots. Error rate is calculated from
  failed/sent counters to avoid precision lost in the exported ratio, then formatted
  as a percentage; transfer values are bytes and bytes/second.
- Each selection is one endpoint within one iteration, round, and run.
  Percentiles are not averaged across endpoints or windows. Exact host-wide
  percentiles cannot be reconstructed from the current InfluxDB export.
- Windowed charts accept both origin-only and full-URL `target` tags, preserving
  compatibility with current LPS exports; cumulative queries match the full target.
- Watchdog region annotations retain machine, node, reason, and start/end times.
  Batch cooldown annotations remain hidden, matching the built-in dashboard.
- Missing data remains missing rather than becoming zero. Server Latency requires
  server-timing response headers; an unfinalized run has no final status yet.

## LPS CLI Configuration

Use the LPS CLI commands to configure InfluxDB integration:

#### Complete Setup (Short Form):
```bash
lps influxdb -ie true -iu "<InfluxDB_URL>" -it "<Your-Token>" -io "<ORG>" -ib "<BucketName>"

```

## See Your Metrics

To view your metrics, import the six [Grafana dashboard templates](../resources/) using the [integration guide](../grafana-integration.md), or run custom queries directly within InfluxDB.

### Grafana Dashboard Setup

Before importing the dashboard template, ensure the following requirements are met:

#### Prerequisites

| Requirement | Description |
|-------------|-------------|
| **InfluxDB Data Source** | An InfluxDB data source must be configured in Grafana with Flux query language enabled |
| **Bucket Name** | Defaults to `LPS_Metrics`; the Bucket selector can change it without editing queries |
| **InfluxDB Version** | InfluxDB 2.x is required (the dashboard uses Flux queries) |
| **Grafana Version** | Grafana 12.3.1 or a compatible version |

#### Import Steps

1. In Grafana, go to **Dashboards** → **Import**
2. Import all six JSON files in [resources](../resources/), starting with [Requests](../resources/lps-requests.json). Preserve their dashboard UIDs so navigation links work.
3. Select your Flux InfluxDB data source using the dashboard's Data source selector
4. Select the bucket, run, round, iteration, and target; use the top links to change views

The local Compose setup provisions all six views automatically. No Grafana panel
plugins are required. Dashboard sources are generated by `build-dashboard.mjs`;
rerun `node start-local.mjs` after editing it to rebuild [resources](../resources/)
and reload the local views. Keep the `grafana` and `resources` folders together.
Older copies under `grafana` are retained for already-running bind mounts; new
imports and provisioning use `resources`. Applying the new mount may recreate
Grafana, so schedule that update around active use.

#### Using a Different Bucket Name

Change the **Bucket** selector at the top of the dashboard. The data source's
token must have read access to that bucket.

---

## Metrics Reference

LPS exports metrics to InfluxDB using the line protocol format. This section documents all available measurements, tags, and fields for custom queries.

### Common Tags

All measurements include these tags for filtering:

| Tag | Description | Example |
|-----|-------------|---------|
| `plan_name` | Plan name with test start timestamp | `MyLoadTest_2026-01-17_14-30-00` |
| `round_name` | Name of the test round | `Round1` |
| `iteration_name` | Name of the iteration | `Iteration1` |
| `target` | Target URL being tested | `https://api.example.com/endpoint` |

---

### Measurements

#### `cumulative_duration` / `windowed_duration`

Latency and timing metrics for HTTP requests.

**Additional Tag:**
| Tag | Values |
|-----|--------|
| `metric` | `total_time`, `tcp_handshake`, `ssl_handshake`, `time_to_first_byte`, `waiting_time`, `receiving_time`, `sending_time` |

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `sum` | float | Sum of all values (ms) |
| `avg` | float | Average value (ms) |
| `min` | float | Minimum value (ms) |
| `max` | float | Maximum value (ms) |
| `p50` | float | 50th percentile (ms) |
| `p90` | float | 90th percentile (ms) |
| `p95` | float | 95th percentile (ms) |
| `p99` | float | 99th percentile (ms) |


---

#### `cumulative_requests`

Cumulative request counts and rates.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `requests_count` | int | Total number of requests |
| `skipped_count` | int | Number of skipped requests |
| `successful_count` | int | Number of successful requests |
| `failed_count` | int | Number of failed requests |
| `max_concurrent_requests` | int | Maximum concurrent requests observed |
| `requests_per_second` | float | Average requests per second |
| `requests_rate_per_cooldown` | float | Request rate per cooldown window |
| `error_rate` | float | Error ratio (0 to 1), displayed as a percentage |
| `time_elapsed_ms` | float | Total elapsed time in milliseconds |

---

#### `windowed_requests`

Request counts per cooldown window.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `requests_count` | int | Requests in this window |
| `skipped_count` | int | Skipped requests in this window |
| `successful_count` | int | Successful requests in this window |
| `failed_count` | int | Failed requests in this window |
| `max_concurrent_requests` | int | Max concurrent requests in this window |

**Skipped Ratio Formula (derived):**

`SkipRatio = skipped_count / (requests_count + skipped_count)`

Use this formula when you need skipped request ratio in custom Influx/Grafana queries.

---

#### `cumulative_response_codes` / `windowed_response_codes`

HTTP response code distribution.

**Additional Tags:**
| Tag | Description |
|-----|-------------|
| `status_code` | HTTP status code (e.g., `200`, `404`, `500`) |
| `status_reason` | HTTP status reason (e.g., `OK`, `Not Found`) |

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `count` | int | Number of responses with this status code |

**Example Query:**
```flux
from(bucket: "LPS_Metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "cumulative_response_codes")
  |> filter(fn: (r) => r["status_code"] == "200")
```

---

#### `cumulative_data_transfer`

Cumulative data transmission metrics.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `data_sent` | float | Total bytes sent |
| `data_received` | float | Total bytes received |
| `avg_data_sent` | float | Average bytes sent per request |
| `avg_data_received` | float | Average bytes received per request |
| `upstream_bps` | float | Upload throughput (bytes/sec) |
| `downstream_bps` | float | Download throughput (bytes/sec) |
| `total_bps` | float | Total throughput (bytes/sec) |

---

#### `windowed_data_transfer`

Data transmission metrics per cooldown window.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `data_sent` | float | Bytes sent in this window |
| `data_received` | float | Bytes received in this window |
| `upstream_bps` | float | Upload throughput (bytes/sec) |
| `downstream_bps` | float | Download throughput (bytes/sec) |
| `total_bps` | float | Total throughput (bytes/sec) |

---

#### `iteration_final_status`

Final status of each iteration (written once when iteration completes).

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Final status: `Success`, `Failed`, `Cancelled`, `Terminated`, or `Skipped` |

**Example Queries:**

**Get the terminal status of a specific test run:**
```flux
from(bucket: "LPS_Metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "iteration_final_status")
  |> filter(fn: (r) => r["_field"] == "status")
  |> filter(fn: (r) => r["iteration_name"] == "Quick-Http-Iteration")
  |> filter(fn: (r) => r["plan_name"] == "Quick-Test-Plan_2026-01-17_02-30-55")
  |> filter(fn: (r) => r["round_name"] == "Quick-Test-Round")
  |> last()
```
This query retrieves the final execution status (`Success`, `Failed`, `Cancelled`, etc.) from the last 24 hours and returns only the most recent value using `last()`.

---

**Get cumulative request metrics for a specific test run (Grafana):**
```flux
from(bucket: "LPS_Metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "cumulative_requests")
  |> filter(fn: (r) => r["_field"] == "max_concurrent_requests" or r["_field"] == "requests_count" or r["_field"] == "requests_per_second" or r["_field"] == "error_rate" or r["_field"] == "failed_count")
  |> filter(fn: (r) => r["iteration_name"] == "Quick-Http-Iteration")
  |> filter(fn: (r) => r["plan_name"] == "Quick-Test-Plan_2026-01-17_02-30-55")
  |> filter(fn: (r) => r["round_name"] == "Quick-Test-Round")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```
This Grafana-specific query:
- Uses Grafana's time range variables (`v.timeRangeStart`, `v.timeRangeStop`) for dynamic filtering
- Retrieves multiple request metrics (concurrent requests, total count, rate, error rate, failures)
- Filters to a specific plan, round, and iteration by their names
- Aggregates data into time windows using `v.windowPeriod` (set by Grafana based on zoom level)
- Calculates the mean for each window, useful for time-series visualizations