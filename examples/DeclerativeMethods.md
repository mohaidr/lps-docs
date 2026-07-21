# Declarative Numeric, Comparison & Crypto Methods — Complete Examples

These declarative methods let you compute values **without** writing Flee expressions. Each is
invoked as `$name(args)`, takes named parameters (`key=value`, comma‑separated), and — like the
other declarative methods — accepts an optional `variable=` to store its result for later use.

> **Variable scope (`isGlobal`):** every method that stores a variable accepts `isGlobal`, and it
> defaults to **`false`** — the stored variable is scoped to the **current session**, so parallel
> virtual clients don't share or overwrite each other's value (the same scoping as `capture` and
> `counter`). Pass `isGlobal=true` to store it **globally**, shared across all sessions.

Most examples below use the **`before`** hook: a list of expressions that run **before** an
iteration's/request's `skipIf`, URL, and headers. Because `before` is an ordered list, a later
expression can reuse what an earlier one stored — perfect for showing these methods in action.

> **Conventions**
> - Reference stored variables with the placeholder form `${name}`.
> - A `source` array may mix literals and placeholders: `source=[${x}, 10, 4, ${z}]`.
> - `source` may also be a single variable that resolves to a JSON array: `source=${prices}`.
> - Numeric results are stored **typed**: whole numbers as integers, otherwise doubles
>   (`divide` and `average` are always doubles). Override with `as=int|double|decimal|bool|string|json`.
> - Comparison methods return the string `"true"`/`"false"`.
> - Every stored variable defaults to **session scope**; add `isGlobal=true` to store it globally.

---

## Parameter quick reference

| Method | Parameters | Result |
|---|---|---|
| `$setvariable` (alias `$set`) | `variable`, `value`, `as` | stores `value` (typed) |
| `$setvariableif` (alias `$setif`) | `variable`, `condition`, `value`, `default`, `as` | conditional typed store |
| `$readif` | `condition`, `source`/`path`/`name`/`encoding`, `default`, `as`, `variable` | conditional read |
| `$sum` | `source`, `variable`, `as` | a + b + c … |
| `$min` / `$max` | `source`, `variable`, `as` | smallest / largest |
| `$multiply` | `source`, `variable`, `as` | a × b × c … |
| `$average` (alias `$avg`) | `source`, `variable`, `as` | arithmetic mean (double) |
| `$divide` | `a`, `b`, `variable`, `as` | a ÷ b (double, guards ÷0) |
| `$subtract` | `a`, `b`, `variable`, `as` | a − b |
| `$mod` | `a`, `b`, `variable`, `as` | remainder of a ÷ b (guards ÷0) |
| `$pow` | `base`, `exponent`, `variable`, `as` | base ^ exponent |
| `$abs` | `source`, `variable`, `as` | absolute value |
| `$floor` / `$ceil` | `source`, `variable`, `as` | round down / up |
| `$round` | `source`, `digits`, `variable`, `as` | round to `digits` places |
| `$clamp` | `value`, `min`, `max`, `variable`, `as` | bound into `[min, max]` |
| `$greaterthan` / `$smallerthan` | `a`, `b`, `variable`, `numberVariable` | bool; optional greater/lesser number |
| `$greaterthanorequal` / `$smallerthanorequal` | `a`, `b`, `variable`, `numberVariable` | bool; optional greater/lesser number |
| `$greater` / `$less` | `a`, `b`, `variable`, `as` | the greater / lesser number |
| `$equal` | `a`, `b`, `tolerance`, `variable` | bool (optional tolerance) |
| `$stringequals` | `a`, `b`, `ignoreCase`, `variable` | bool string equality |
| `$strcat` | `values`, `separator`, `variable` | joins values into one string |
| `$hmac` | `value`, `key`, `algorithm`, `encoding`, `variable` | keyed HMAC digest (hex/base64) |
| `$jwtsign` | `claims`, `key` \| `source`/`path`/`name`, `algorithm`, `expiresIn`, `variable` | signed compact JWT (HS/RS/ES) |
| `$findxml` | `source`, `path`, `where`, `select`, `match`, `namespaces`, `ignoreNamespaces`, `variable` | XPath filter/project over XML |

---

## Set a variable

`$setvariable` stores a value (optionally typed). `$set` is a shorthand alias.

```yaml
name: SetVariableDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: prepare
        before:
          - '$setvariable(variable=greeting, value=hello)'          # stored as a string
          - '$set(variable=retries, value=3, as=int)'               # alias + typed as int
          - '$setvariable(variable=payload, value=[1,2,3], as=json)' # stored as navigable JSON
        httpRequest:
          headers:
            X-Greeting: '${greeting}'
            X-Retries: '${retries}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

### Arithmetic in numeric values

When `as` is numeric (`int`, `double`, `decimal`, …), `value` is evaluated as an **arithmetic expression**
before it is stored — so `2+3` stores `5`, not the text `"2+3"`. Division is integer for whole operands
(`10/4` → `2`); use `10.0/4` (or `1.5+1`) for `2.5`. Placeholders resolve first, so `${a}+${b}` computes
from the resolved numbers. Without a numeric `as`, the value is stored **verbatim**.

```yaml
before:
  - '$set(variable=total, value=2+3, as=int)'          # 5
  - '$set(variable=area, value=${w}*${h}, as=int)'      # e.g. 4*3 -> 12
  - '$set(variable=ratio, value=10.0/4, as=double)'     # 2.5
  - '$set(variable=literal, value=2+3)'                 # "2+3" (string, not evaluated)
```

---

## Conditional set — `setvariableif` / `setif`

`$setvariableif` stores `value` when `condition` is true and `default` when it is false; with no `default`, a
false condition leaves the variable **untouched**. `$setif` is a shorthand alias. `condition` uses the
same Flee syntax as `skipIf`, and a numeric `as` evaluates arithmetic in `value`/`default`.

```yaml
name: SetVariableIfDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    iterations:
      - name: prepare
        before:
          # pick a tier from a captured total
          - '$setvariableif(variable=tier, condition=${order.total} > 100, value=premium, default=standard)'
          # set a page size only when it is missing (otherwise leave it as-is)
          - '$setif(variable=pageSize, condition="${pageSize}" == "", value=20, as=int)'
          # conditional arithmetic: charge double unless a discount is active
          - '$setvariableif(variable=charge, condition=${discount} == 0, value=${price}*2, default=${price}, as=double)'
        httpRequest:
          headers:
            X-Tier: '${tier}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Conditional read — `readif`

`$readif` is the conditional form of `$read`: when `condition` is true it reads from a file, environment
variable, or another variable and stores the result; when false it stores `default` (or leaves the variable
untouched). Only the taken branch runs, so a skipped read never touches the file system.

```yaml
name: ReadIfDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    iterations:
      - name: prepare
        before:
          # read the overrides file only when the flag is on; default to {} otherwise
          - '$readif(condition=${useOverrides} == true, source=file, path=../data/overrides.json, as=json, variable=overrides, default={})'
          # pull a token from the environment only in CI
          - '$readif(condition="${env}" == "ci", source=env, name=API_TOKEN, variable=token)'
        httpRequest:
          headers:
            Authorization: 'Bearer ${token}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Aggregations over an array — sum, min, max, multiply, average

`source` is a JSON array; elements can be literals, placeholders, or a variable holding an array.

```yaml
name: AggregationDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: aggregate
        before:
          - '$setvariable(variable=x, value=5, as=int)'
          - '$setvariable(variable=z, value=7, as=int)'
          - '$sum(source=[${x}, 10, 4, ${z}], variable=total)'      # 26
          - '$min(source=[8, 2, 5], variable=lowest)'               # 2
          - '$max(source=[8, 2, 5], variable=highest)'              # 8
          - '$multiply(source=[2, 3, 4], variable=product)'         # 24
          - '$average(source=[1, 2, 3, 4], variable=mean)'          # 2.5
          - '$avg(source=[2, 4, 6], variable=meanShort)'            # 4 (alias)
        httpRequest:
          headers:
            X-Total: '${total}'
            X-Lowest: '${lowest}'
            X-Highest: '${highest}'
            X-Product: '${product}'
            X-Mean: '${mean}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

### Aggregating a captured response array

```yaml
name: AggregateCaptureDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getPrices
        httpRequest:
          capture:
            to: prices          # e.g. a JSON array like [10, 20, 30]
            as: Json
            makeGlobal: true
          url: https://example.com/api/prices
          method: GET

      - name: computeTotal
        before:
          - '$sum(source=${prices}, variable=cartTotal)'
        httpRequest:
          headers:
            X-Cart-Total: '${cartTotal}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Binary arithmetic — divide, subtract, mod, pow

```yaml
name: ArithmeticDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: compute
        before:
          - '$divide(a=10, b=4, variable=ratio)'          # 2.5 (always a double)
          - '$subtract(a=100, b=35, variable=remaining)'  # 65
          - '$mod(a=10, b=3, variable=leftover)'          # 1
          - '$pow(base=2, exponent=10, variable=capacity)' # 1024
        httpRequest:
          headers:
            X-Ratio: '${ratio}'
            X-Remaining: '${remaining}'
            X-Leftover: '${leftover}'
            X-Capacity: '${capacity}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

> `divide` and `mod` guard against a zero divisor — they log a warning and produce an empty
> result instead of throwing.

---

## Unary math — abs, floor, ceil, round, clamp

`abs`, `floor`, and `ceil` accept `source` either named or positionally (`$abs(-7)`).

```yaml
name: UnaryMathDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: shape
        before:
          - '$abs(source=-5, variable=magnitude)'                 # 5
          - '$abs(-7, variable=magnitude2)'                       # 7 (positional)
          - '$floor(source=2.7, variable=low)'                    # 2
          - '$ceil(source=2.1, variable=high)'                    # 3
          - '$round(source=3.14159, digits=2, variable=pi)'       # 3.14
          - '$round(source=2.6, variable=nearest)'                # 3 (digits defaults to 0)
          - '$clamp(value=15, min=0, max=10, variable=bounded)'   # 10
        httpRequest:
          headers:
            X-Magnitude: '${magnitude}'
            X-Low: '${low}'
            X-High: '${high}'
            X-Pi: '${pi}'
            X-Bounded: '${bounded}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Comparisons that also capture the winning number

`$greaterthan`, `$smallerthan`, `$greaterthanorequal`, and `$smallerthanorequal` store the
`"true"`/`"false"` outcome in `variable`, and — optionally — the greater (or lesser) of the two
operands in `numberVariable`.

```yaml
name: ComparisonDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getMetric
        httpRequest:
          capture:
            to: p95            # e.g. a latency number
            as: Text
            makeGlobal: true
          url: https://example.com/api/latency
          method: GET

      - name: evaluate
        before:
          # is p95 above the SLA? also keep whichever value is larger.
          - '$greaterthan(a=${p95}, b=250, variable=slaBreached, numberVariable=worstLatency)'
          - '$smallerthan(a=${p95}, b=100, variable=isFast, numberVariable=bestCase)'
          - '$greaterthanorequal(a=5, b=5, variable=atLeastFive)'   # true
          - '$smallerthanorequal(a=9, b=5, variable=withinFive)'    # false
        # skipIf skips when TRUE — send the alert request only when the SLA was breached.
        skipIf: '${slaBreached} != true'
        httpRequest:
          headers:
            X-Worst-Latency: '${worstLatency}'
          url: https://example.com/api/alert
          method: POST
```

---

## Pick the greater / lesser number — greater, less

Unlike the comparison methods, `$greater` and `$less` return the **number** itself.

```yaml
name: GreaterLessDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: choose
        before:
          - '$greater(a=${p90}, b=${p95}, variable=worstLatency)'  # the larger of the two
          - '$less(a=${configured}, b=${maxAllowed}, variable=effectiveLimit)'
        httpRequest:
          headers:
            X-Worst-Latency: '${worstLatency}'
            X-Effective-Limit: '${effectiveLimit}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Equality — equal (numeric) and stringequals (text)

`$equal` compares numbers, with an optional `tolerance` for approximate matches.
`$stringequals` compares text, with an optional `ignoreCase` flag.

```yaml
name: EqualityDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: verify
        before:
          - '$equal(a=${count}, b=100, variable=isExact)'              # exact match
          - '$equal(a=${count}, b=100, tolerance=2, variable=isNear)'  # |count - 100| <= 2
          - '$stringequals(a=${status}, b=OK, ignoreCase=true, variable=isOk)'
        # proceed only when the status is OK (skipIf skips when TRUE).
        skipIf: '${isOk} != true'
        httpRequest:
          headers:
            X-Is-Exact: '${isExact}'
            X-Is-Near: '${isNear}'
          url: https://jsonplaceholder.typicode.com/posts/1
          method: GET
```

---

## Concatenate strings — strcat

`$strcat` glues values together into one string. Pass the values as a bracketed list `[a, b, c]`
(split on commas); each element is placeholder‑resolved, then joined with the optional `separator`.
Wrap an element or the separator in double quotes to keep surrounding spaces.

```yaml
name: StrcatDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: build
        before:
          - '$setvariable(variable=firstName, value=Sara)'
          - '$setvariable(variable=lastName, value=Ali)'
          - '$setvariable(variable=userId, value=42, as=int)'
          - '$strcat(values=[${firstName}, ${lastName}], separator=" ", variable=fullName)'   # "Sara Ali"
          - '$strcat(values=[https://api.example.com/users/, ${userId}], variable=userUrl)'   # ".../users/42"
          - '$strcat(values=[${firstName}, @, example.com], variable=login)'                  # "Sara@example.com"
        httpRequest:
          headers:
            X-Full-Name: '${fullName}'
            X-Login: '${login}'
          url: '${userUrl}'
          method: GET
```

---

## Chaining methods together

`before` runs top to bottom, so you can build a small computation pipeline: aggregate, derive,
compare, and branch — all before the request is sent.

```yaml
name: PipelineDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getLatencies
        httpRequest:
          capture:
            to: latencies       # e.g. [120, 340, 90, 500, 210]
            as: Json
            makeGlobal: true
          url: https://example.com/api/latencies
          method: GET

      - name: analyze
        before:
          - '$average(source=${latencies}, variable=avgLatency)'          # mean latency
          - '$max(source=${latencies}, variable=peakLatency)'             # worst latency
          - '$round(source=${avgLatency}, digits=1, variable=avgRounded)' # tidy for reporting
          - '$greaterthan(a=${peakLatency}, b=450, variable=overBudget)'  # SLA check
          - '$clamp(value=${avgLatency}, min=0, max=1000, variable=safeAvg)'
        # only send the report when we are over budget.
        skipIf: '${overBudget} != true'
        httpRequest:
          headers:
            X-Avg-Latency: '${avgRounded}'
            X-Peak-Latency: '${peakLatency}'
          url: https://example.com/api/report
          method: POST
```

---

## Signing & tokens — hmac, jwtsign

`$hmac` produces a keyed signature (e.g. a webhook signature header); `$jwtsign` mints a signed
JWT (e.g. for an OAuth JWT‑bearer flow). Both resolve `${...}` placeholders in their inputs. The
signing key can be supplied inline via `key=`, or — so secrets stay out of the YAML — loaded from a
**file** (`path=`), an **environment variable** (`source=env, name=`), or a **stored variable**
(`source=variable, name=`), exactly the way `$read` loads values. When any of `source`/`path`/`name`
is present it takes precedence over an inline `key`.

### hmac — webhook signature header

```yaml
name: HmacDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: signAndSend
        httpRequest:
          before:
            - '$setvariable(variable=webhookSecret, value=$read(source=env, name=WEBHOOK_SECRET))'
            - '$hmac(value=${requestBody}, key=${webhookSecret}, algorithm=SHA256, encoding=base64, variable=signature)'
          headers:
            X-Signature: '${signature}'
          url: https://example.com/webhooks/receive
          method: POST
```

### jwtsign — RFC 7523 JWT‑bearer OAuth flow (HS256, key from env)

```yaml
name: JwtBearerDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getToken
        httpRequest:
          before:
            # HMAC secret read straight from $env:JWT_SIGNING_KEY — nothing sensitive in the YAML.
            - '$jwtsign(claims={"iss":"${clientId}","sub":"${clientId}","aud":"${tokenUrl}"}, source=env, name=JWT_SIGNING_KEY, algorithm=HS256, expiresIn=300, variable=assertion)'
          url: '${tokenUrl}'
          method: POST
          headers:
            Content-Type: application/x-www-form-urlencoded
          payload:
            type: Raw
            raw: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}'
```

Set the secret before the run (PowerShell): `$env:JWT_SIGNING_KEY = "super-secret-hmac-key"`.

### jwtsign — asymmetric RS256 with a private‑key file

```yaml
name: JwtBearerRs256Demo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getToken
        httpRequest:
          before:
            # RSA private key (PEM) loaded from disk; the header alg becomes RS256.
            - '$jwtsign(claims={"iss":"${clientId}","sub":"${clientId}","aud":"${tokenUrl}"}, path=./keys/private.pem, algorithm=RS256, expiresIn=300, variable=assertion)'
          url: '${tokenUrl}'
          method: POST
          headers:
            Content-Type: application/x-www-form-urlencoded
          payload:
            type: Raw
            raw: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}'
```

Generate a test key with:
`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ./keys/private.pem`.

### jwtsign — key from a stored variable

Load the key once into a plan variable (here from disk, but it could come from an `environments:`
override), then reference it by name with `source=variable`:

```yaml
name: JwtBearerVariableDemo
variables:
  - name: privatePem
    value: $read(path=./keys/private.pem)
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getToken
        httpRequest:
          before:
            - '$jwtsign(claims={"iss":"${clientId}","sub":"${clientId}","aud":"${tokenUrl}"}, source=variable, name=privatePem, algorithm=RS256, expiresIn=300, variable=assertion)'
          url: '${tokenUrl}'
          method: POST
          headers:
            Content-Type: application/x-www-form-urlencoded
          payload:
            type: Raw
            raw: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}'
```

> `$jwtsign` signs with symmetric `HS256`/`HS384`/`HS512` (an inline or loaded secret) and
> asymmetric `RS256`/`RS384`/`RS512` and `ES256`/`ES384`/`ES512` (a PEM private key). The key may be
> inline (`key=`), from a file (`path=`), an env var (`source=env, name=`), or a stored variable
> (`source=variable, name=`) — a `source`/`path`/`name` takes precedence over an inline `key`. It
> adds `iat` automatically and derives `exp` from `expiresIn`, without overriding any claim you set
> yourself. Encrypted PEM keys aren't supported yet.

---

## Filtering XML — findxml

`$find` works on JSON; `$findxml` is its XPath counterpart for **XML** captures. It selects nodes
with `path`, filters with an XPath `where` predicate, and projects a value with a relative `select`
path — using the same `match` modes as `find` (`first` | `last` | `index:N` | `count` | `all`).

```yaml
name: FindXmlDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getOrders
        httpRequest:
          capture:
            to: orders
            as: Xml
            makeGlobal: true
          url: https://example.com/api/orders.xml
          method: GET

      - name: process
        # captured `orders` looks like:
        #   <orders>
        #     <order kind="online"><id>1</id><status>shipped</status><total>150</total></order>
        #     <order kind="store"><id>2</id><status>pending</status><total>50</total></order>
        #     <order kind="online"><id>3</id><status>shipped</status><total>300</total></order>
        #   </orders>
        before:
          # first shipped order's id -> 1
          - '$findxml(source=$orders.Body, path=/orders/order, where=status="shipped", select=id, match=first, variable=firstShippedId)'
          # last shipped order's total -> 300
          - '$findxml(source=$orders.Body, path=/orders/order, where=status="shipped", select=total, match=last, variable=lastShippedTotal)'
          # 2nd order with total>100 (0-based) -> id 3
          - '$findxml(source=$orders.Body, path=/orders/order, where=total>100, select=id, match=index:1, variable=secondBig)'
          # how many are shipped -> 2
          - '$findxml(source=$orders.Body, path=/orders/order, where=status="shipped", match=count, variable=shippedCount)'
          # every shipped id -> ["1","3"]
          - '$findxml(source=$orders.Body, path=/orders/order, where=status="shipped", select=id, match=all, variable=shippedIds)'
          # attribute filter + attribute projection -> "online"
          - '$findxml(source=$orders.Body, path=/orders/order, where=@kind="online", select=@kind, match=first, variable=firstKind)'
          # no match -> default
          - '$findxml(source=$orders.Body, path=/orders/order, where=status="cancelled", select=id, match=first, default=NONE, variable=cancelledId)'
        httpRequest:
          headers:
            X-First-Shipped: '${firstShippedId}'
            X-Shipped-Count: '${shippedCount}'
          url: https://example.com/api/next
          method: GET
```

### Namespaced XML (incl. SOAP)

XPath 1.0 treats an unprefixed name as *no namespace*, so a document that declares an `xmlns` won't
match a bare `/orders/order`. Two options: declare prefixes with `namespaces=prefix=uri;…` and use
them in your XPath, or set `ignoreNamespaces=true` to strip namespaces so unprefixed XPath matches.

```yaml
name: FindXmlNamespacesDemo
rounds:
  - name: FeatureRound
    numberOfClients: 1
    arrivalDelay: 1000
    runInParallel: false
    iterations:
      - name: getSoap
        httpRequest:
          capture:
            to: soap
            as: Xml
            makeGlobal: true
          url: https://example.com/api/orders.soap.xml
          method: GET

      - name: process
        # captured `soap` looks like:
        #   <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
        #     <s:Body>
        #       <o:order xmlns:o="urn:shop:orders"><o:id>1</o:id><o:status>shipped</o:status></o:order>
        #     </s:Body>
        #   </s:Envelope>
        before:
          # Declare the prefixes, then use them in path/where/select.
          - '$findxml(source=$soap.Body, namespaces=s=http://schemas.xmlsoap.org/soap/envelope/;o=urn:shop:orders, path=/s:Envelope/s:Body/o:order, where=o:status="shipped", select=o:id, match=first, variable=shippedId)'
          # Or ignore namespaces entirely and use plain, unprefixed XPath.
          - '$findxml(source=$soap.Body, ignoreNamespaces=true, path=/Envelope/Body/order, where=status="shipped", select=id, match=first, variable=shippedIdPlain)'
        httpRequest:
          headers:
            X-Shipped-Id: '${shippedId}'
          url: https://example.com/api/next
          method: GET
```

> Write XPath string literals in `where`/`select` with **double quotes** (`status="shipped"`) so the
> single‑quoted YAML expression is not broken. XML namespaces are supported two ways — declare
> prefixes with `namespaces=prefix=uri;…` and use them in your XPath, or set `ignoreNamespaces=true`
> to strip them so unprefixed XPath matches (handy for SOAP). External entities are disabled (XXE‑safe).
