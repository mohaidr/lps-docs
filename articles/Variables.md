
# Variables in LPS Tool

The **LPS Tool** supports the use of variables to dynamically inject values into test configurations, making them highly customizable and adaptable. Variables can be used in various contexts, such as HTTP headers, payloads, URLs, and conditions. This flexibility allows for efficient test design and execution.

## Key Features

1. **Dynamic Value Substitution**:  
   Variables can dynamically replace parts of URLs, headers, and payloads during runtime, ensuring tests can adapt to changing data.

2. **Support for External Data Sources**:  
   Variables can reference external files (e.g., CSV, JSON) to inject large datasets into tests.

3. **Environment-Specific Variables**:  
   Variables can be scoped to specific environments (e.g., production, staging) for targeted configurations.

4. **Predefined and Generated Variables**:  
   Variables can be predefined in the configuration or generated dynamically during test execution.

## Resolution Behavior

All variable placeholders (e.g **$authToken, $userId**) will be resolved **before the plan execution starts** and not during execution, except for placeholders used in the following contexts:
- **URL**
- **HTTP Method**
- **Headers**
- **HTTP Version**
- **Payload of type Raw**

For payloads of type **multipart** or **binary**, variables will be resolved just before the actual execution of the test plan.

## Examples of Variable Usage

### JSON Property Access
Variables containing JSON data can be accessed using dot notation or array indexing. Below are examples:

- Access a property: `$content.property`
- Access an array element:  `$content.array[0]`
- Access an array element using a placeholder as index: `$content.array[$index]`
- Access a nested property: `$content.array[$index].item`
- Access deeply nested properties: `$content.object.property.subProperty`

### XML Property Access
Variables containing XML data can be accessed using XPath-like syntax. Below are examples:

- Access a property: `$content/item`
- Access a nested property: `$content/item/subitem`
- Access an attribute: `$content/item/@attribute`
- Access a specific element by index: `$content/item[1]/subitem`

### CSV Property Access
- Access CSV item: `$content[0,0]`
- Access using a placeholder as index `$content[$index,$index]`


### In URLs
```yaml
url: https://api.example.com/resource/$productList[0,0]
```

### In HTTP Headers
```yaml
httpHeaders:
  X-Client-Data: $productList[0,$envConfig.rounds[0].clientCount]
  X-Round-Name: $envConfig.rounds[0].name
  Authorization: $authToken
```

### In Payloads
```yaml
payload:
  type: Raw
  raw: "[$userId,$envConfig.rounds[0].name] ($generateRandom() $sessionToken)"
```

### Environment-Specific Variables
In the production environment:
```yaml
- to: envConfig
  value: $read(path=../data/config.json)
  as: json
- to: authSchema
  value: Bearer
- to: authToken
  value: $authSchema $sessionToken
```

## Variable Declaration Syntax

Variables are declared in the `variables` section of the YAML configuration file. Below is an example:

```yaml
variables:
- to: userId
  value: 1001
- to: productList
  value: $read(path=/path/to/products.csv)
  as: csv
- to: sessionToken
  value: Bearer abc123exampleToken
  as: text
```

## Examples of powerfull capabilities

### Referencing External Files
You can use the `$read` function to load external data into a variable, such as CSV or JSON files:
```yaml
- to: productList
  value: $read(path=/path/to/products.csv)
  as: csv
```

### Dynamic Concatenation
Variables can combine multiple values dynamically:
```yaml
- to: concatenatedValue
  value: $productList[0,0]_$productList[1,0]
```

### Regex and Transformation
Variables can apply transformations or constraints using regex:
```yaml
- to: commandCode
  value: command42
  regex: \d+
```

## Environment-Specific Variable Scoping

Environments can define their own set of variables, allowing configurations to adapt based on the environment. For example:

### Production Environment
```yaml
environments:
- name: production
  variables:
  - to: minValue
    value: 10
  - to: maxValue
    value: 500
```

### Staging Environment
```yaml
- name: staging
  variables:
  - to: minValue
    value: 100
  - to: maxValue
    value: 1000
```

## Example YAML Configuration

```yaml
variables:
- to: userId
  value: 1001
- to: productList
  value: $read(path=/path/to/products.csv)
  as: csv
environments:
- name: production
  variables:
  - to: authSchema
    value: Bearer
  - to: sessionToken
    value: abc123exampleToken
```

Variables are a powerful feature of the LPS Tool, enabling flexibility and customization across all stages of test execution.
