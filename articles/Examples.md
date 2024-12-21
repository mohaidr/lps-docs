
# LPS Tool Comprehensive Examples

This document provides practical examples of how to use the LPS tool, including command usage, basic test scripts, and advanced scenarios with variables and methods.

---

## **Important Notes on Variables and Methods**

- **Variable Resolution**:
  - Variables are **global** and are resolved **before execution** of the test.
  - When a method is assigned to a variable, the method is executed **once**, and its result is assigned to the variable. This ensures consistent values for the variable throughout the test.
  - For methods like `loopcounter` to be evaluated per session, they must be used directly in the context of their application, such as within URLs, headers, or payloads.

---

## **Examples of Commands Usage**

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

## **Examples of Test Scripts with Real-Life Scenarios**

### Scenario 1: API Health Check
```yaml
name: APIHealthCheck
rounds:
- name: HealthCheckRound
  startupDelay: 0
  numberOfClients: 1
  runInParallel: false
  iterations:
  - name: HealthCheckIteration
    httpRequest:
      url: https://api.example.com/health
      httpMethod: GET
      httpVersion: 2.0
    mode: R
    requestCount: 5
```
**Purpose**: Verifies the availability and response of the `/health` endpoint.

---

## **Advanced Examples: Variables and Methods**

### Scenario 1: Using Variables with Methods
```yaml
name: VariableWithMethodsExample
variables:
- to: randomString
  value: $random(length=10)
- to: timestamp
  value: $timestamp(format=yyyy-MM-ddTHH:mm:ss)
- to: randomNumber
  value: $randomnumber(min=1, max=100)
rounds:
- name: RandomizedRequestRound
  numberOfClients: 5
  iterations:
  - name: RandomizedIteration
    httpRequest:
      url: https://api.example.com/resource?query=$randomString&timestamp=$timestamp
      httpMethod: GET
      httpHeaders:
        X-Random-Number: "$randomNumber"
    mode: R
    requestCount: 10
```
**Important**: In this example:
  - `$random`, `$timestamp`, and `$randomnumber` methods are resolved once before execution, and their results are used throughout the test.

---

### Scenario 2: Using `loopcounter` for Per-Session Evaluation
```yaml
name: LoopCounterExample
rounds:
- name: LoopCounterRound
  numberOfClients: 2
  iterations:
  - name: LoopCounterIteration
    httpRequest:
      url: https://api.example.com/resource/$loopcounter(start=0, end=9)
      httpMethod: GET
    mode: R
    requestCount: 20
```
**Purpose**: Demonstrates the use of `loopcounter` directly in the URL to ensure it is evaluated for each session or request.

---

### Scenario 3: Combining Methods in Variables
```yaml
name: CombinedMethodsExample
variables:
- to: hashedValue
  value: $hash(value=$random(length=15), algorithm=SHA256)
- to: encodedValue
  value: $base64encode(value=$timestamp(format=yyyy-MM-dd))
rounds:
- name: CombinedMethodsRound
  numberOfClients: 3
  iterations:
  - name: CombinedMethodsIteration
    httpRequest:
      url: https://api.example.com/data?hash=$hashedValue
      httpMethod: POST
      payload:
        type: Raw
        raw: '{"encodedDate": "$encodedValue"}'
    mode: D
    duration: 60
```
**Important**: The `hashedValue` and `encodedValue` variables are computed once and retain their values during the test execution.

---

These combined examples illustrate the powerful capabilities of the LPS Tool, from simple commands and scripts to advanced variable-driven configurations.
