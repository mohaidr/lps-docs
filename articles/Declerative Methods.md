
# Supported Methods in LPS Tool

The LPS Tool supports various methods that can be used within variables or directly in configurations. These methods provide flexibility and dynamic behavior during test execution.

## Supported Methods and Their Usage

### 1. Random
Generates a random alphanumeric string of a specified length.

**Parameters:**
- `length`: Length of the generated string (default: `10`).

**Example:**
```plaintext
random(length=16)
```
Generates a random string of 16 characters.

---

### 2. RandomNumber
Generates a random number within a specified range.

**Parameters:**
- `min`: Minimum value (default: `1`).
- `max`: Maximum value (default: `100`).

**Example:**
```plaintext
randomnumber(min=10, max=50)
```
Generates a random number between 10 and 50.

---

### 3. Timestamp
Generates the current UTC timestamp in a specified format.

**Parameters:**
- `format`: Date-time format (default: `yyyy-MM-ddTHH:mm:ss`).

**Example:**
```plaintext
timestamp(format=yyyy-MM-dd)
```
Generates the current date in the format `2024-12-21`.

---

### 4. GUID
Generates a globally unique identifier (GUID).

**Example:**
```plaintext
guid()
```
Generates a GUID, e.g., `d9b8e764-ff50-4f67-a902-2df745b73d2a`.

---

### 5. Base64Encode
Encodes a given string into Base64 format.

**Parameters:**
- `value`: The string to be encoded (default: empty string).

**Example:**
```plaintext
base64encode(value=HelloWorld)
```
Encodes `HelloWorld` into `SGVsbG9Xb3JsZA==`.

---

### 6. Hash
Generates a hash for a given string using the specified algorithm.

**Parameters:**
- `value`: The string to be hashed (default: empty string).
- `algorithm`: Hashing algorithm (default: `SHA256`). Supported algorithms: `MD5`, `SHA256`, `SHA1`.

**Example:**
```plaintext
hash(value=MySecretValue, algorithm=MD5)
```
Hashes the string `MySecretValue` using the MD5 algorithm.

---

### 7. Read
Reads the content of a file from the specified path.

**Parameters:**
- `path`: File path (required).

**Example:**
```plaintext
read(path=../plans/rounds.json)
```
Reads the content of the file located at `../plans/rounds.json`.

---

### 8. LoopCounter

Maintains a counter within a specified range. The counter is unique per session, signature, and optionally per counter name when specified.

**Parameters:**
- `start`: Starting value of the counter (default: `0`).
- `end`: Ending value of the counter (default: `100000`).
- `counter`: (Optional) A unique counter name. If specified, this allows the creation of multiple independent counters with the same `start` and `end` values.

**Behavior:**
- The counter increments with each call.
- When the counter exceeds the `end` value, it resets to the `start` value.
- The counter is unique per session. For example, the counter used in a URL, headers, or payloads will be unique per client.
- Each method signature, including the optional `counter` parameter, maintains its own counter. For instance, `loopcounter(start=0, end=10)` and `loopcounter(start=0, end=10, counter=myCounter)` will have separate counters.
- Counters used by global variables will be unique to those global variables and do not interfere with session-level counters.

**Examples:**
```plaintext
loopcounter(start=0, end=10)
```
Returns sequential values from 0 to 10, then resets to 0.

```plaintext
loopcounter(start=5, end=15, counter=myCounter)
```
Returns sequential values from 5 to 15 for the specified `myCounter`, then resets to 5. This counter is independent of other `loopcounter` calls.

---

## Notes on Usage
- These methods are thread-safe and optimized for performance.
- Default values are provided for most parameters, making them easy to use without extensive configuration.
- Placeholders like these can dynamically adapt your testing setup for various scenarios.

