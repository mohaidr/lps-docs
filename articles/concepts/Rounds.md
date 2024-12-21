
# Introduction to Rounds

A **Round** represents a testing phase or cycle in the LPS Tool. Each round defines a set of configurations, including the base URL, the number of clients, and the iterations that simulate specific user interactions or requests. Rounds always run **sequentially**, respecting any configured **startup delays** between each round.

## Key Attributes of a Round
- **Name**: Identifier for the round.
- **Startup Delay**: Time to wait before the round starts.
- **Number of Clients**: Specifies the number of simulated users for the test.
- **Arrival Delay**: Time in milliseconds to wait before each new client arrives.
- **Run In Parallel**: Specifies whether iterations within the round can execute in parallel.
- **Tags**: Useful for categorizing and filtering rounds.

## Example
```yaml
rounds:
- name: ExampleRound
  startupDelay: 5
  numberOfClients: 10
  arrivalDelay: 500
  runInParallel: true
  tags:
    - test
    - performance
```
