# InfluxDB Integration

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


## LPS Configuration

Use the LPS CLI commands to configure InfluxDB integration:

#### Complete Setup (Short Form):
```bash
lps influxdb -ie true -iu "<InfluxDB_URL>" -it "<Your-Token>" -io "<ORG>" -ib "<BucketName>"

```

## See Your Metrics

To view your metrics, you can either import the [Grafana Dashboard Template](https://github.com/mohaidr/lps-docs/blob/main/grafana/LPS%20Grafana%20%20Dashboard.json) to quickly set up a pre-configured Grafana dashboard, or run custom queries directly within InfluxDB.

### Grafana Dashboard Setup

Before importing the dashboard template, ensure the following requirements are met:

#### Prerequisites

| Requirement | Description |
|-------------|-------------|
| **InfluxDB Data Source** | An InfluxDB data source must be configured in Grafana with Flux query language enabled |
| **Bucket Name** | The dashboard expects a bucket named `LPS_Metrics`. If your bucket has a different name, update the queries accordingly |
| **InfluxDB Version** | InfluxDB 2.x is required (the dashboard uses Flux queries) |
| **Grafana Version** | Grafana 12.3.1 or a compatible version |

#### Import Steps

1. In Grafana, go to **Dashboards** → **Import**
2. Upload the JSON file or paste its contents
3. When prompted, select your InfluxDB data source for the `DS_INFLUXDB` variable
4. Click **Import**

#### Using a Different Bucket Name

If your bucket is not named `LPS_Metrics`, you have two options:

- **Before Import**: Open the JSON file and replace all occurrences of `"LPS_Metrics"` with your bucket name
- **After Import**: Edit each panel's query and update the bucket name

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
| `successful_count` | int | Number of successful requests |
| `failed_count` | int | Number of failed requests |
| `max_concurrent_requests` | int | Maximum concurrent requests observed |
| `requests_per_second` | float | Average requests per second |
| `requests_rate_per_cooldown` | float | Request rate per cooldown window |
| `error_rate` | float | Error rate percentage |
| `time_elapsed_ms` | float | Total elapsed time in milliseconds |

---

#### `windowed_requests`

Request counts per cooldown window.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `requests_count` | int | Requests in this window |
| `successful_count` | int | Successful requests in this window |
| `failed_count` | int | Failed requests in this window |
| `max_concurrent_requests` | int | Max concurrent requests in this window |

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