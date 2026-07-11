# before & after Expressions

`before` and `after` are **lifecycle hooks**: lists of expressions that run **around** an iteration
or request. Each expression is evaluated for its **side effects** — typically a
`$find(..., variable=x)` (or any method with a `variable=` output) that stores a variable — and the
returned value is discarded.

- **`before`** is a **pre‑execution hook**. Its key benefit is **ordering**: `skipIf`, the URL, and
  headers are all evaluated *before* a request is sent, so a request cannot normally set up a
  variable and use it in its own `skipIf`. A `before` expression runs **first**, closing that gap —
  prepare data up front and then use it in the same iteration/request.
- **`after`** is a **post‑execution hook** that runs once the iteration/request has run. Because it
  runs *after* the response is received and captured, it can read the response and captured
  variables and prepare data for the next step.

Both `before` and `after` are available in two places:

- at **iteration** level (runs once per iteration)
- at **`httpRequest`** level (runs around each request)

## Semantics

- `before` and `after` are YAML **lists**; expressions run **in order**, top to bottom.
- A later expression can use a variable an earlier one set.
- Errors are logged and do not abort execution.
- **`before`** runs **before** the matching `skipIf` check (and before the URL/headers).
- **`after`** runs **after** execution:
  - **Request-level:** after the request completes (including its retries). It runs on both success
    and failure, but **not** when `skipIf` skipped the request, and **not** on cancellation.
  - **Iteration-level:** after the iteration completes successfully.
- An **iteration‑level** hook runs once per iteration, while a **request‑level** hook runs around
  every request in the iteration.

## Iteration-level before

Set up variables once when the iteration starts, then verify with `skipIf`.

```yaml
name: BeforeDemo
rounds:
  - name: FeatureRound
    numberOfClients: 3
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getUsers
        httpRequest:
          capture:
            to: users
            as: Json
            makeGlobal: true
          url: https://jsonplaceholder.typicode.com/users
          method: GET

      - name: useMatchedUser
        before:
          - '$find(source=$users.Body, where=item.company.name == "Romaguera-Crona", match=first, variable=matchedUser)'
          - '$find(source=$users.Body, where=item.username == "Bret", select=item.id, match=first, variable=uid)'
        # skipIf skips when TRUE -> this runs only when the match is who we expect.
        skipIf: '${uid} != 1 or "${matchedUser.username}" != "Bret"'
        httpRequest:
          url: 'https://jsonplaceholder.typicode.com/users/${matchedUser.id}/todos'
          method: GET
```

## Request-level before

Use `httpRequest.before` when the setup should run right before that specific request.

```yaml
name: BeforeRequestDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getUsers
        httpRequest:
          capture:
            to: users
            as: Json
            makeGlobal: true
          url: https://jsonplaceholder.typicode.com/users
          method: GET

      - name: getAlbums
        httpRequest:
          before:
            - '$find(source=$users.Body, where=item.username == "Bret", select=item.id, match=first, variable=userId)'
          url: 'https://jsonplaceholder.typicode.com/users/${userId}/albums'
          method: GET
```

## Request-level after

Use `httpRequest.after` to post-process a response right after that request runs — it can read the
captured response and store values for later steps.

```yaml
name: AfterRequestDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getUser
        httpRequest:
          capture:
            to: user
            as: Json
            makeGlobal: true
          url: https://jsonplaceholder.typicode.com/users/1
          method: GET
          after:
            - '$setvariable(variable=userCity, value=${user.Body.address.city})'

      - name: useAfterResult
        httpRequest:
          headers:
            X-User-City: '${userCity}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

## Iteration-level after

Iteration-level `after` runs after the iteration completes successfully. Use it to compute roll-up
values from what the iteration produced.

```yaml
name: AfterIterationDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getUsers
        after:
          - '$find(source=$users.Body, where=item.id > 5, match=count, variable=bigUserCount)'
          - '$greaterthan(a=${bigUserCount}, b=3, variable=hasManyUsers)'
        httpRequest:
          capture:
            to: users
            as: Json
            makeGlobal: true
          url: https://jsonplaceholder.typicode.com/users
          method: GET
```

## Notes

- A request cannot use data it **captures itself** in `before`/`skipIf` — capture happens after the
  response, while `before`/`skipIf` run before the request is sent. Use `after` (or an earlier
  iteration) to work with a response the request itself produced.
- `after` runs after the response is captured, so it can read captured variables (e.g.
  `$find(source=$users.Body, ...)`) and prepare data for the next iteration/request.
- `before`/`after` pair naturally with the [`find`](https://github.com/mohaidr/lps-docs/blob/main/articles/4.Declerative%20Methods.md#find)
  method, but work with any method that stores a `variable=`.
- See runnable examples in [examples/20.Before.md](https://github.com/mohaidr/lps-docs/blob/main/examples/20.Before.md).
