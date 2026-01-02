# Azure OpenAI Chat Load Test (via API Key)

This example shows how to **load test** Azure OpenAI’s `chat/completions` endpoint using an **API key**.  
It simulates many users chatting with GPT‑4 to test speed and stability.

---

## 🔧 Setup Overview

**Variables**
- `azureOpenAIBase`: your service URL.  
- `deployment`: model name (e.g., gpt‑4).  
- `apiVersion`: API version.  
- `apiKey`: your key.  
- Optional: `temperature`, `topP`, `maxTokens` – tweak creativity and response size.

**Round**
- `ChatRound`: 500 virtual clients join every second (`arrivalDelay: 1000`).

---

## 📘 YAML Example

```yaml
name: AzureOpenAI_Chat_via_ApiKey
variables:
  - name: azureOpenAIBase
    value: https://myopenaiservice.openai.azure.com
    as: string
  - name: deployment
    value: gpt-4
    as: string
  - name: apiVersion
    value: 2024-02-15-preview
    as: string
  - name: apiKey
    value: your_api_key_here
    as: string

  # Optional knobs (use or remove)
  - name: temperature
    value: 0.7
  - name: topP
    value: 0.95
  - name: maxTokens
    value: 1638

rounds:
- name: ChatRound
  numberOfClients: 500
  arrivalDelay: 1000
  iterations:
  - name: InitialMessage
    httpRequest:
      url: $azureOpenAIBase/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview
      httpMethod: POST
      httpversion: 1.1
      saveResponse: true
      httpHeaders:
        Content-Type: application/json
        api-key: $apiKey
      payload:
        raw: |
              {
                "messages": [
                  {
                    "role": "system",
                    "content": [
                      {
                        "type": "text",
                        "text": "Ok, Pick a number between 1 and 100."
                      }
                    ]
                  }
                ],
                "temperature": $temperature,
                "max_tokens":  $maxTokens
              }
      capture:
        to: chatResponse
        as: json

  - name: ConversationMessages
    skipIf: '"${chatResponse.Body.choices[0].message.content}" = ""'
    mode: R
    requestCount: 1
    httpRequest:
      url: $azureOpenAIBase/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview
      httpMethod: POST
      httpversion: 1.1
      saveResponse: true
      httpHeaders:
        Content-Type: application/json
        api-key: $apiKey
      payload:
        raw: |
              {
                "messages": [
                  {
                    "role": "system",
                    "content": [
                      {
                        "type": "text",
                        "text": "Ok, Pick a number between 1 and 100."
                      }
                    ]
                  },
                  {
                    "role": "assistant",
                    "content": [
                      {
                        "type": "text",
                        "text": "${chatResponse.Body.choices[0].message.content}"
                      }
                    ]
                  },
                  {
                    "role": "user",
                    "content": [
                      {
                        "type": "text",
                        "text": "The number you picked was $counter(start=1, reset=5, isGlobal=true). right?"
                      }
                    ]
                  }
                ],
                "temperature": $temperature,
                "max_tokens": $maxTokens
              }
```


## 🧠 Key Points

| Concept | What It Does |
|----------|--------------|
| **Capture** | Saves response for next step. |
| **skipIf** | Skips if response empty. |
| **$counter** | Adds changing numbers. |
| **Variables** | Keep setup clean & easy to tweak. |

---

✅ **Tip:** Perfect for checking how your Azure OpenAI setup performs under heavy chat traffic.  
Replace `your_api_key_here`, adjust the url, client count, and run the test.
