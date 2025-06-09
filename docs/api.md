# API Reference

This document provides comprehensive API reference for the OpenAI-compatible endpoints provided by the Copilot API proxy.

## Overview

The Copilot API proxy exposes OpenAI-compatible endpoints that translate requests to GitHub Copilot's internal API format. All endpoints support both standard and `/v1/` prefixed paths for maximum compatibility.

**Base URL**: `http://localhost:4141` (default)

## Authentication

The proxy handles GitHub authentication internally. No API keys are required for client requests - authentication is managed through the GitHub OAuth flow during server startup.

## Endpoints

### Chat Completions

Create chat completions with streaming or non-streaming responses.

#### `POST /chat/completions` or `POST /v1/chat/completions`

**Request Body:**
```json
{
  "model": "string",
  "messages": [
    {
      "role": "user|assistant|system",
      "content": "string" | [content_parts]
    }
  ],
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 1000,
  "stop": ["string"],
  "n": 1,
  "stream": false
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model identifier (e.g., "gpt-4", "gpt-3.5-turbo") |
| `messages` | array | Yes | Array of message objects |
| `temperature` | number | No | Sampling temperature (0.0 to 2.0) |
| `top_p` | number | No | Nucleus sampling parameter (0.0 to 1.0) |
| `max_tokens` | number | No | Maximum tokens to generate (auto-detected if not provided) |
| `stop` | array | No | Stop sequences |
| `n` | number | No | Number of completions (currently supports 1) |
| `stream` | boolean | No | Enable streaming responses |

**Message Format:**

Simple text message:
```json
{
  "role": "user",
  "content": "Hello, how are you?"
}
```

Vision-enabled message with image:
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "What's in this image?"
    },
    {
      "type": "input_image",
      "image_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
    }
  ]
}
```

#### Non-Streaming Response

**Status Code**: `200 OK`

**Response Body:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking."
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ]
}
```

#### Streaming Response

**Content-Type**: `text/event-stream`

**Response Format**: Server-Sent Events (SSE)

```
data: {"choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null,"logprobs":null}],"created":1677652288,"object":"chat.completion.chunk","id":"chatcmpl-123","model":"gpt-4"}

data: {"choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null,"logprobs":null}],"created":1677652288,"object":"chat.completion.chunk","id":"chatcmpl-123","model":"gpt-4"}

data: {"choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null,"logprobs":null}],"created":1677652288,"object":"chat.completion.chunk","id":"chatcmpl-123","model":"gpt-4"}

data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop","logprobs":null}],"created":1677652288,"object":"chat.completion.chunk","id":"chatcmpl-123","model":"gpt-4"}

data: [DONE]
```

#### Examples

**Basic chat completion:**
```bash
curl -X POST http://localhost:4141/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Write a haiku about programming"}
    ],
    "max_tokens": 100
  }'
```

**Streaming chat completion:**
```bash
curl -X POST http://localhost:4141/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Count from 1 to 5"}
    ],
    "stream": true
  }'
```

**Vision-enabled completion:**
```bash
curl -X POST http://localhost:4141/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "What do you see in this image?"
          },
          {
            "type": "input_image",
            "image_url": "data:image/jpeg;base64,/9j/4AAQ..."
          }
        ]
      }
    ]
  }'
```

### Models

List available models from GitHub Copilot.

#### `GET /models` or `GET /v1/models`

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1677652288,
      "owned_by": "github-copilot",
      "capabilities": {
        "family": "gpt-4",
        "limits": {
          "max_prompt_tokens": 128000,
          "max_output_tokens": 4096
        },
        "object": "model_capabilities",
        "supports_parallel_tool_calls": false,
        "supports_vision": true
      }
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:4141/models
```

### Embeddings

Generate text embeddings using GitHub Copilot's embedding models.

#### `POST /embeddings` or `POST /v1/embeddings`

**Request Body:**
```json
{
  "model": "text-embedding-ada-002",
  "input": "string" | ["string1", "string2"]
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Embedding model identifier |
| `input` | string/array | Yes | Text to embed (string or array of strings) |

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.1, 0.2, -0.3, ...]
    }
  ],
  "model": "text-embedding-ada-002",
  "usage": {
    "prompt_tokens": 8,
    "total_tokens": 8
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:4141/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "The quick brown fox jumps over the lazy dog"
  }'
```

### Health Check

Simple health check endpoint.

#### `GET /`

**Response:**
```
Server running
```

**Example:**
```bash
curl http://localhost:4141/
```

## Request/Response Translation

The proxy automatically translates between OpenAI and GitHub Copilot formats:

### Message Content Translation

**OpenAI Format** → **Copilot Format**:
- `"input_image"` → `"image_url"`
- Standard OpenAI content structure → Copilot-compatible structure

### Model Translation

The proxy maps OpenAI model names to available Copilot models:
- Client requests `"gpt-4"` → Uses best available Copilot model
- Model capabilities are translated to OpenAI format

### Error Response Translation

Copilot API errors are translated to OpenAI-compatible error responses:

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

## Rate Limiting

The proxy includes configurable rate limiting:

### Configuration
```bash
# 30-second intervals between requests
copilot-api start --rate-limit 30

# Wait instead of erroring when rate limited
copilot-api start --rate-limit 30 --wait
```

### Rate Limit Responses

**Without `--wait` flag:**
```json
{
  "error": {
    "message": "Rate limit exceeded. Please wait 25 seconds.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

**With `--wait` flag:**
- Request blocks until rate limit window passes
- Normal response returned after wait

## Manual Approval

Enable manual approval mode for request review:

```bash
copilot-api start --manual
```

When enabled:
1. Each request pauses for manual approval
2. Server prompts: `Approve request? (y/N)`
3. Approved requests proceed normally
4. Rejected requests return error response

## Error Handling

### Common Error Responses

**Authentication Error (401):**
```json
{
  "error": {
    "message": "Invalid authentication credentials",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```

**Rate Limit Error (429):**
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error", 
    "code": "rate_limit_exceeded"
  }
}
```

**Server Error (500):**
```json
{
  "error": {
    "message": "Internal server error",
    "type": "server_error",
    "code": "internal_error"
  }
}
```

**Validation Error (400):**
```json
{
  "error": {
    "message": "Invalid request format",
    "type": "invalid_request_error",
    "code": "invalid_request"
  }
}
```

## Client Integration Examples

### Python (OpenAI SDK)

```python
import openai

# Configure client to use proxy
client = openai.OpenAI(
    base_url="http://localhost:4141",
    api_key="not-needed"  # Proxy handles auth
)

# Chat completion
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:4141',
  apiKey: 'not-needed'
});

async function chatCompletion() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello!' }],
    model: 'gpt-4',
  });

  console.log(completion.choices[0].message.content);
}
```

### cURL Examples

**Basic completion:**
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Streaming completion:**
```bash
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }' \
  --no-buffer
```

## CORS Support

The proxy includes CORS headers for browser-based applications:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Compatibility Notes

### OpenAI SDK Compatibility

The proxy is designed to work with official OpenAI SDKs:
- ✅ Python `openai` package
- ✅ JavaScript/TypeScript `openai` package  
- ✅ Custom HTTP clients
- ✅ Tools expecting OpenAI API format

### Feature Support

| Feature | Supported | Notes |
|---------|-----------|-------|
| Chat Completions | ✅ | Full support |
| Streaming | ✅ | Server-Sent Events |
| Vision | ✅ | Image inputs supported |
| Embeddings | ✅ | Text embeddings |
| Function Calling | ❌ | Not available in Copilot API |
| Fine-tuning | ❌ | Not applicable |
| Assistants API | ❌ | Not applicable |

### Model Limitations

- Available models depend on your GitHub Copilot subscription
- Model capabilities are determined by GitHub Copilot backend
- Token limits are enforced by the underlying Copilot service

---

**Next Steps:**
- Review [authentication documentation](auth.md) for GitHub OAuth details
- Check [configuration options](config.md) for environment variables
- See [architecture documentation](architecture.md) for implementation details