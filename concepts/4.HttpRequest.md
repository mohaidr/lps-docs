
# HttpRequest Configuration

The **HttpRequest** configuration specifies the details of each HTTP interaction. These details define how requests are sent and processed.

## Key Attributes
- **URL**: The endpoint to which the request is sent.
- **HTTP Method**: Defines the type of request (e.g., GET, POST, PUT).
- **Headers**: Key-value pairs included in the request.
- **Payload**: Data sent with the request (e.g., JSON body).
- **Version**: HTTP version (e.g., 1.1, 2.0).

### Example
```yaml
httpRequest:
  url: https://api.example.com/resource
  httpMethod: POST
  headers:
    Content-Type: application/json
  payload:
    type: Raw
    raw: '{"key": "value"}'
  httpVersion: 2.0
```
