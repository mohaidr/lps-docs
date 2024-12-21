## Concepts

The **LPS Tool** is built on core concepts that define its functionality and flexibility. Understanding these concepts is crucial for effectively designing and executing tests. The primary components of the tool include **Rounds**, **Iterations**, **Iteration Modes**, **HttpRequest**, **Variables**, **Methods**, and **Features** like the **WatchDog**.

### Rounds

A **Round** represents a testing phase or cycle in the LPS Tool. Each round defines a set of configurations, including the base URL, the number of clients, and the iterations that simulate specific user interactions or requests. Rounds always run **sequentially**, respecting any configured **startup delays** between each round.

Key attributes of a round:
- **Name**: Identifier for the round.
- **Startup Delay**: Time to wait before the round starts.
- **Number of Clients**: Specifies the number of simulated users for the test.
- **Arrival Delay**: Time in milliseconds to wait before each new client arrives.
- **Run In Parallel**: Specifies whether iterations within the round can execute in parallel.
- **Tags**: Useful for categorizing and filtering rounds.

### Iterations

An **Iteration** defines the individual actions or requests performed during a round. Each iteration can represent a unique HTTP request, with options for capturing responses, using payloads, and applying headers.

Iterations within a round can run either **sequentially** or **in parallel**, depending on the configuration. However, parallel execution is only possible when the **capture** feature is **not used or not set**. If capturing responses is required, iterations must run sequentially to ensure accurate data collection and avoid conflicts.

Key attributes of an iteration:
- **Name**: Identifier for the iteration.
- **HTTP Request**: Configuration for the request, including the method, URL, headers, and payload.
- **Mode**: Defines how the iteration operates (see **Iteration Modes**).
- **Startup Delay**: Optional delay before starting the iteration.

### Global Iterations and References

Iterations can also be defined as **global iterations** and referenced later within rounds using the `reference` property. This allows for reusable iteration configurations across multiple rounds, reducing redundancy and improving maintainability.

#### Example of Defining a Global Iteration and Referencing It

```yaml
name: helloplan
iterations:
- name: helloiteration
  mode: DCB
  duration: 300
  batchSize: 100
  coolDownTime: 1000
  httpRequest:
    url: https://httpbin.org/headers
    httpMethod: GET
    httpVersion: 2.0
rounds:
- name: helloround
  numberOfClients: 1
  iterations:
    - name: localIteration
      mode: DCB
      duration: 600
      batchSize: 50
      coolDownTime: 1000
      httpRequest:
          url: https://httpbin.org/headers
          httpMethod: GET
          httpVersion: 2.0
  reference: ["helloiteration"]
```

In this example:
1. A global iteration named `helloiteration` is defined under the `iterations` section.
2. The `reference` property in the round references the global iteration, allowing its configuration to be reused.

This approach ensures that iterations can be centrally managed and easily reused across multiple rounds, improving both efficiency and clarity in test configurations.


### Iteration Modes

Iteration Modes control the pattern and timing of HTTP requests, offering flexibility to simulate various user behaviors and system loads. The available modes include:

- **D (Duration)**: Runs sequential requests for a specified period of time.
- **DCB (Duration-Cooldown-Batchsize)**: Sends batches of requests with cooldown periods for a specified duration.
- **CRB (Cooldown-Request-Batchsize)**: Sends batches of requests with cooldown periods up to a specified number of total requests.
- **CB (Cooldown-Batchsize)**: Sends batches of requests with cooldown periods until the user cancels the test.
- **R (Request Count)**: Sends sequential requests up to a specified number of requests.

### HttpRequest

The **HttpRequest** configuration specifies the details of each HTTP interaction, including:
- **URL**: The endpoint to which the request is sent.
- **HTTP Method**: Defines the type of request (e.g., GET, POST, PUT).
- **Headers**: Key-value pairs included in the request.
- **Payload**: Data sent with the request (e.g., JSON body).
- **Version**: HTTP version (e.g., 1.1, 2.0).

### Variables

Variables enhance the flexibility of test scenarios by allowing dynamic data to be injected into requests. They can be predefined or generated during the test and are useful for:
- Storing values captured from responses.
- Referencing external data sources like CSV files or JSON configurations.
- Creating parameterized test cases.

### Methods

The **Methods** in the LPS Tool allow for enhanced functionality and dynamic behavior during testing. Supported methods include:
- **random**: Generates a random string.
- **randomnumber**: Generates a random number.
- **timestamp**: Generates a timestamp.
- **guid**: Generates a GUID.
- **base64encode**: Encodes text in Base64 format.
- **hash**: Generates a hash of a given text.
- **read**: Reads content from a file.
- **loopcounter**: Provides a sequential number on each call.

### WatchDog

The **WatchDog** is a feature of the LPS Tool that monitors system resources during tests to ensure stability and prevent resource exhaustion. While it plays a crucial role in stabilizing system performance, it does not currently expose insights or detailed metrics to the user.
