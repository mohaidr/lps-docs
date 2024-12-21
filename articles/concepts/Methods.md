
# Methods in LPS

LPS supports a variety of methods that can be used within variables or directly in scripts to enhance test scenarios.

## Available Methods
1. **random**: Generates a random string of characters.
   - **Parameters**: `length` (default: 10)
   - **Example**:
     ```yaml
     variables:
     - to: randomString
       value: $random(length=15)
     ```
     Generates a random string of 15 characters.

2. **randomnumber**: Generates a random number within a specified range.
   - **Parameters**: `min` (default: 1), `max` (default: 100)
   - **Example**:
     ```yaml
     variables:
     - to: randomNumber
       value: $randomnumber(min=10, max=50)
     ```

3. **timestamp**: Generates a timestamp in the specified format.
   - **Parameters**: `format` (default: `yyyy-MM-ddTHH:mm:ss`)
   - **Example**:
     ```yaml
     variables:
     - to: currentTimestamp
       value: $timestamp(format=yyyy-MM-dd)
     ```

4. **guid**: Generates a globally unique identifier (GUID).
   - **Example**:
     ```yaml
     variables:
     - to: uniqueId
       value: $guid()
     ```

5. **base64encode**: Encodes a string in Base64 format.
   - **Parameters**: `value`
   - **Example**:
     ```yaml
     variables:
     - to: encodedValue
       value: $base64encode(value=HelloWorld)
     ```

6. **hash**: Generates a hash of the input string.
   - **Parameters**: `value`, `algorithm` (default: `SHA256`)
   - **Example**:
     ```yaml
     variables:
     - to: hashedValue
       value: $hash(value=MyPassword, algorithm=SHA256)
     ```

7. **read**: Reads the contents of a file.
   - **Parameters**: `path`
   - **Example**:
     ```yaml
     variables:
     - to: fileContent
       value: $read(path=../data/sample.txt)
     ```

8. **loopcounter**: Maintains a counter within a specified range.
   - **Parameters**: `start` (default: 0), `end` (default: 100000), `counter` (optional name for counter)
   - **Example**:
     ```yaml
     variables:
     - to: counterValue
       value: $loopcounter(start=0, end=10, counter=myCounter)
     ```

---
