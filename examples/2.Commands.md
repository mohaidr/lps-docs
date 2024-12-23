
# Commands Usage

### 1. Running a Test Plan
```bash
lps run tests/my_test_plan.yaml
```
Runs a test plan defined in `my_test_plan.yaml`.

### 2. Creating a New Round
```bash
lps round tests/round_config.yaml --name LoadTestRound --baseUrl https://api.example.com --numberofclients 10 --runinparallel
```
Creates a new round named `LoadTestRound` targeting `https://api.example.com` with 10 clients executing iterations in parallel.

### 3. Adding an HTTP Iteration
```bash
lps iteration tests/iteration_config.yaml --roundName LoadTestRound --name GetEndpoint --url https://api.example.com/resource --method GET --iterationMode D --duration 60
```
Adds an iteration named `GetEndpoint` that sends GET requests to the specified URL for 60 seconds.

### 4. Capturing HTTP Response
```bash
lps capture tests/capture_config.yaml --iterationname CaptureAuthToken --roundName LoginRound --to authToken --regex "\bBearer\s.+\b"
```
Captures an authorization token from the response of the `LoginRound` iteration using a regex and saves it in the variable `authToken`.

### 5. Setting Global Variables
```bash
lps variable tests/variables_config.yaml --name baseUrl --value https://api.example.com
```
Sets a global variable `baseUrl` with the value `https://api.example.com`.

### 6. Configuring Watchdog
```bash
lps watchdog --maxMemoryMB 1000 --maxCPUPercentage 70 --coolDownRetryTimeInSeconds 2
```
Sets a watchdog configuration to monitor memory and CPU usage during test execution.

---
### Configuring Logger
```bash
lps logger -ecl -lfp "/path/to/logfile.log"
```