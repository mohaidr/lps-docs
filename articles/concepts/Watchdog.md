
# Watchdog in LPS

The **Watchdog** feature in LPS ensures system stability by monitoring and controlling resource usage during tests. It automatically pauses tests when specified resource thresholds are exceeded and resumes them when conditions return to acceptable levels.

## Key Features
- **Memory Usage Monitoring**: Pauses tests if memory usage exceeds a specified limit and resumes when it drops below a defined threshold.
- **CPU Usage Monitoring**: Monitors CPU usage and controls test execution accordingly.
- **Concurrent Connections**: Limits the number of concurrent connections per hostname.

## Configuration Parameters
1. **Memory Limits**
   - `maxMemoryMB`: Maximum memory usage before pausing the test.
   - `coolDownMemoryMB`: Memory usage threshold for resuming the test.

2. **CPU Usage**
   - `maxCPUPercentage`: Maximum CPU usage before pausing the test.
   - `coolDownCPUPercentage`: CPU usage threshold for resuming the test.

3. **Connections**
   - `maxConcurrentConnectionsCountPerHostName`: Maximum connections per hostname before pausing the test.
   - `coolDownConcurrentConnectionsCountPerHostName`: Threshold for resuming connections.

4. **Retry and Suspension**
   - `coolDownRetryTimeInSeconds`: Interval to check if conditions are met for resuming the test.
   - `suspensionMode`: Specifies whether to pause tests when all or any thresholds are exceeded.

5. **Prevent Infinite Cooling**
   - `MaxCoolingPeriod`: Specifies the maximum time (in seconds) that the system will stay in a cooling state (paused) before resuming the test.
   - `suspensionMode`: Specifies the time interval (in seconds) after which the system will attempt to resume cooling if the system resources are still above the max thresholds


## Example Configuration
```yaml
LPSWatchdogConfiguration:
  MaxMemoryMB: 1000
  CoolDownMemoryMB: 700
  MaxCPUPercentage: 70
  CoolDownCPUPercentage: 50
  CoolDownRetryTimeInSeconds: 1
  MaxConcurrentConnectionsCountPerHostName: 3000
  CoolDownConcurrentConnectionsCountPerHostName: 2500
  MaxCoolingPeriod: 60
  ResumeCoolingAfter: 60
  SuspensionMode: 0
```

---
