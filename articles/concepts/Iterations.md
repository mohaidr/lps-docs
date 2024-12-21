
# Understanding Iterations

An **Iteration** defines the individual actions or requests performed during a round. Each iteration can represent a unique HTTP request, with options for capturing responses, using payloads, and applying headers.

## Key Attributes of an Iteration
- **Name**: Identifier for the iteration.
- **HTTP Request**: Configuration for the request, including the method, URL, headers, and payload.
- **Mode**: Defines how the iteration operates (see **Iteration Modes**).
- **Startup Delay**: Optional delay before starting the iteration.

## Global Iterations and References
Iterations can also be defined as **global iterations** and referenced later within rounds using the `reference` property. This allows for reusable iteration configurations across multiple rounds, reducing redundancy and improving maintainability.

### Example
```yaml
name: GlobalIterationPlan
iterations:
- name: GlobalIteration
  mode: DCB
  duration: 300
  batchSize: 100
  coolDownTime: 1000
  httpRequest:
    url: https://httpbin.org/headers
    httpMethod: GET
    httpVersion: 2.0
rounds:
- name: TestRound
  numberOfClients: 1
  reference: ["GlobalIteration"]
```
