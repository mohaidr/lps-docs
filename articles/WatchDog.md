
# WatchDog Mechanism

The **WatchDog** mechanism in the LPS Tool is designed to monitor and control resource usage during testing. By enforcing thresholds on system resources such as memory, CPU usage, and concurrent connections, it ensures that the testing process does not overwhelm the system or network. It pauses tests when resource limits are exceeded and resumes them when conditions stabilize or the max cooling period elapses.

## Command Usage

```bash
lps watchdog [options]
```

## How It Works

1. **Monitoring Resource Usage**:  
   The WatchDog continuously monitors critical system resources, including:
   - Memory usage (in MB).
   - CPU usage (as a percentage).
   - Maximum concurrent connections per host name.

2. **Pausing Tests**:  
   When resource usage exceeds the specified thresholds, the WatchDog pauses the test to prevent overloading the system or network.

3. **Resuming Tests**:  
   The WatchDog resumes paused tests when resource usage falls below defined cooldown thresholds.

4. **Cooling Periods**:  
   The WatchDog uses a cooling mechanism to ensure stability, including retry intervals and maximum cooling periods to avoid indefinite pauses.

5. **Suspension Mode**:  
   Determines whether tests are paused when all thresholds are exceeded or any single threshold is breached.

## Options

### Threshold Options
- `-mmm`, `--maxMemoryMB <maxMemoryMB>`:  
  Sets a memory usage limit (in MB) that pauses the test upon being reached.

- `-mcp`, `--maxCPUPercentage <maxCPUPercentage>`:  
  Specifies a CPU usage limit (as a percentage) to pause the test.

- `-mcccphn`, `--maxConcurrentConnectionsCountPerHostName <maxConcurrentConnectionsCountPerHostName>`:  
  Limits the maximum number of concurrent connections per host name to pause the test.

### Cooldown Options
- `-cdmm`, `--coolDownMemoryMB <coolDownMemoryMB>`:  
  Specifies the memory usage threshold (in MB) for resuming a paused test.

- `-coolDownCPUPercentage <coolDownCPUPercentage>`:  
  Specifies the CPU usage threshold (as a percentage) for test resumption.

- `-cdcccphn`, `--coolDownConcurrentConnectionsCountPerHostName <coolDownConcurrentConnectionsCountPerHostName>`:  
  Defines the concurrent connection limit per host for resuming tests.

- `-cdrtis`, `--coolDownRetryTimeInSeconds <coolDownRetryTimeInSeconds>`:  
  Interval (in seconds) for checking if the test can be resumed.

- `-maxcp`, `--maxcoolingperiod`, `--MAXCOOLINGPERIOD <maxcoolingperiod>`:  
  Specifies the maximum cooling period (in seconds) to avoid the system being stuck in a never-resuming state.

- `-rca`, `--resumecoolingafter`, `--RESUMECOOLINGAFTER <resumecoolingafter>`:  
  Resume cooling after a specified time (in seconds) if resources are still above the threshold.

### Suspension Mode
- `-sm`, `--suspensionMode <All|Any>`:  
  Determines whether to pause the test when:
  - **All** thresholds are exceeded.  
  - **Any** single threshold is breached.
