# Copilot API

⚠️ **EDUCATIONAL PURPOSE ONLY** ⚠️
This project is a reverse-engineered implementation of the GitHub Copilot API created for educational purposes only. It is not officially supported by GitHub and should not be used in production environments.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)

## Project Overview

A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools like AI assistants, local interfaces, and development utilities.

## Demo

https://github.com/user-attachments/assets/7654b383-669d-4eb9-b23c-06d7aefee8c5

## Prerequisites

- GitHub account with **Copilot subscription** (Individual or Business)
- One of the following runtime environments:
    - **Bun** (>= 1.2.x) for running from source or local development.
    - **Docker** or **Podman** for containerized deployment.
    - **Node.js** and **`npm`** (for using **`npx`**) if you prefer running directly without cloning the repository.


## Installation

To install dependencies, run:

```sh
bun install
```

## Using with Docker

First, ensure you have Docker installed.

**1. Build the Docker Image:**
```sh
docker build -t copilot-api .
```

**2. Run the Docker Container:**
   - **Without `GH_TOKEN` (will attempt auth flow on first run if token not found):**
     ```sh
     docker run --init -it -p 4141:4141 copilot-api
     ```
   - **With `GH_TOKEN` for persistency (Recommended):**
     If you've generated a `GH_TOKEN` (see [Generating `GH_TOKEN`](#generating-gh_token-optional-but-recommended-for-dockerpodman)), use it:
     ```sh
     docker run --init -it -e GH_TOKEN="YOUR_GH_TOKEN_HERE" -p 4141:4141 copilot-api
     ```
   - **To run the authentication flow directly inside a Docker container (if you haven't generated a token yet):**
     ```sh
     docker run -it --rm copilot-api sh -c '
         bun run dist/main.js auth && \
         echo -n "GitHub Token: $(cat /root/.local/share/copilot-api/github_token)"'
     ```
     Follow the prompts. The token will be displayed at the end, which you can then use for subsequent runs with the `-e GH_TOKEN` flag.

## Using with Podman

First, ensure you have Podman installed. The steps are very similar to Docker.

**1. Build the Podman Image:**
```sh
podman build -t copilot-api .
```
*Note: If you intend to pass `GH_TOKEN` as a build argument (less common for runtime secrets), your Dockerfile/Containerfile would need to be set up to handle it. For runtime, environment variables are preferred.*

**2. Run the Podman Container:**
   - **Without `GH_TOKEN` (will attempt auth flow on first run if token not found):**
     ```sh
     podman run --init -it -p 4141:4141 copilot-api
     ```
   - **With `GH_TOKEN` for persistency (Recommended):**
     If you've generated a `GH_TOKEN` (see [Generating `GH_TOKEN`](#generating-gh_token-optional-but-recommended-for-dockerpodman)), use it:
     ```sh
     podman run --init -it -e GH_TOKEN="YOUR_GH_TOKEN_HERE" -p 4141:4141 copilot-api
     ```
   - **To run the authentication flow directly inside a Podman container (if you haven't generated a token yet):**
     ```sh
     podman run -it --rm copilot-api sh -c '
         bun run dist/main.js auth && \
         echo -n "GitHub Token: $(cat /root/.local/share/copilot-api/github_token)"'
     ```
     Follow the prompts. The token will be displayed at the end, which you can then use for subsequent runs with the `-e GH_TOKEN` flag.

## Using with `npx`

If you have Node.js and npm installed, you can run the project directly using `npx` without cloning the repository.

**Start the server:**
```sh
npx copilot-api@latest start
```

**With options (e.g., custom port):**
```sh
npx copilot-api@latest start --port 8080
```

**For authentication only (to generate `GH_TOKEN`):**
Refer to the [Generating `GH_TOKEN`](#generating-gh_token-optional-but-recommended-for-dockerpodman) section.
```sh
npx copilot-api@latest auth
```

## Command Structure

Copilot API now uses a subcommand structure with two main commands:

- `start`: Start the Copilot API server (default command). This command will also handle authentication if needed.
- `auth`: Run GitHub authentication flow without starting the server. This is typically used if you need to generate a token for use with the `--github-token` option, especially in non-interactive environments.

## Command Line Options

### Start Command Options

The following command line options are available for the `start` command:

| Option         | Description                                                                   | Default | Alias |
| -------------- | ----------------------------------------------------------------------------- | ------- | ----- |
| --port         | Port to listen on                                                             | 4141    | -p    |
| --verbose      | Enable verbose logging                                                        | false   | -v    |
| --business     | Use a business plan GitHub account                                            | false   | none  |
| --manual       | Enable manual request approval                                                | false   | none  |
| --rate-limit   | Rate limit in seconds between requests                                        | none    | -r    |
| --wait         | Wait instead of error when rate limit is hit                                  | false   | -w    |
| --github-token | Provide GitHub token directly (must be generated using the `auth` subcommand) | none    | -g    |

### Auth Command Options

| Option    | Description            | Default | Alias |
| --------- | ---------------------- | ------- | ----- |
| --verbose | Enable verbose logging | false   | -v    |

## Example Usage

Using with npx:

```sh
# Basic usage with start command
npx copilot-api@latest start

# Run on custom port with verbose logging
npx copilot-api@latest start --port 8080 --verbose

# Use with a Business GitHub account
npx copilot-api@latest start --business

# Enable manual approval for each request
npx copilot-api@latest start --manual

# Set rate limit to 30 seconds between requests
npx copilot-api@latest start --rate-limit 30

# Wait instead of error when rate limit is hit
npx copilot-api@latest start --rate-limit 30 --wait

# Provide GitHub token directly
npx copilot-api@latest start --github-token ghp_YOUR_TOKEN_HERE

# Run only the auth flow
npx copilot-api@latest auth

# Run auth flow with verbose logging
npx copilot-api@latest auth --verbose
```

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
bun run dev
```

### Production Mode

```sh
bun run start
```

## Usage Tips

- Consider using free models (e.g., Gemini, Mistral, Openrouter) as the `weak-model`
- Use architect mode sparingly
- Disable `yes-always` in your aider configuration
- Be mindful that Claude 3.7 thinking mode consumes more tokens
- Enable the `--manual` flag to review and approve each request before processing
- If you have a GitHub Business account with Copilot, use the `--business` flag

### Manual Request Approval

When using the `--manual` flag, the server will prompt you to approve each incoming request:

```
? Accept incoming request? > (y/N)
```

This helps you control usage and monitor requests in real-time.
