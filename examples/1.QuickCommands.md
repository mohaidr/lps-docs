
# Quick Command Examples

## Basic Commands
### Simple GET Request
```bash
lps --url https://www.example.com -rc 1000
```
**Description**: Sends 1000 GET requests to the specified URL.

### POST Request with Inline Payload
```bash
lps --url https://www.example.com -rc 1000 --httpmethod "POST" --payload "Inline Payload"
```
**Description**: Sends 1000 POST requests with an inline payload.

### POST Request with File Payload
```bash
lps --url https://www.example.com -rc 1000 --httpmethod "POST" --payload "Path:C:\Users\User\Desktop\LPS\urnice.json"
```
**Description**: Sends 1000 POST requests with a payload from a file.

### POST Request with Payload URL
```bash
lps --url https://www.example.com -rc 1000 --httpmethod "POST" --payload "URL:https://www.example.com/payload"
```
**Description**: Sends 1000 POST requests with a payload fetched from a URL.

---
