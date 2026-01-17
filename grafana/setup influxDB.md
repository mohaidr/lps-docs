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

## See your metrics

To view your metrics, you can either import the [Grafana Dashboard Template](/LPS%20Grafana%20%20Dashboard.json) to quickly set up a pre-configured Grafana dashboard, or run custom queries directly within InfluxDB.

