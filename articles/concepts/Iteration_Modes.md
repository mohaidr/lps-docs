# Iteration Modes Explained

Iteration Modes control the pattern and timing of HTTP requests, offering flexibility to simulate various user behaviors and system loads.

## Available Modes

### 1. **D (Duration)**
Runs sequential requests for a specified period of time.

#### Example
```yaml
name: DurationTestPlan
rounds:
- name: DurationRound
  numberOfClients: 1
  iterations:
  - name: DurationModeExample
    mode: D
    duration: 300
    httpRequest:
      url: https://api.example.com/resource
      httpMethod: GET
```
**Purpose**: Runs requests sequentially for 300 seconds.

---

### 2. **DCB (Duration-Cooldown-Batchsize)**
Sends batches of requests with cooldown periods for a specified duration.

#### Example
```yaml
name: DCBTestPlan
rounds:
- name: DCBRound
  numberOfClients: 1
  iterations:
  - name: DurationCooldownBatchExample
    mode: DCB
    duration: 300
    batchSize: 100
    coolDownTime: 500
    httpRequest:
      url: https://api.example.com/resource
      httpMethod: GET
```
**Purpose**: Sends 100 requests in each batch, with a 500-millisecond cooldown between batches, for 300 seconds.

---

### 3. **CRB (Cooldown-Request-Batchsize)**
Sends batches of requests with cooldown periods up to a specified number of total requests.

#### Example
```yaml
name: CRBTestPlan
rounds:
- name: CRBRound
  numberOfClients: 1
  iterations:
  - name: CooldownRequestBatchExample
    mode: CRB
    requestCount: 500
    batchSize: 50
    coolDownTime: 1000
    httpRequest:
      url: https://api.example.com/resource
      httpMethod: GET
```
**Purpose**: Sends 50 requests in each batch, with a 1000-millisecond cooldown between batches, until a total of 500 requests is reached.

---

### 4. **CB (Cooldown-Batchsize)**
Sends batches of requests with cooldown periods until the test is manually stopped.

#### Example
```yaml
name: CBTestPlan
rounds:
- name: CBRound
  numberOfClients: 1
  iterations:
  - name: CooldownBatchExample
    mode: CB
    batchSize: 100
    coolDownTime: 500
    httpRequest:
      url: https://api.example.com/resource
      httpMethod: GET
```
**Purpose**: Sends 100 requests per batch, with a 500-millisecond cooldown, running indefinitely until stopped.

---

### 5. **R (Request Count)**
Sends sequential requests up to a specified number of requests.

#### Example
```yaml
name: RequestCountTestPlan
rounds:
- name: RequestCountRound
  numberOfClients: 1
  iterations:
  - name: RequestCountExample
    mode: R
    requestCount: 200
    httpRequest:
      url: https://api.example.com/resource
      httpMethod: GET
```
**Purpose**: Sends 200 requests sequentially.

---
