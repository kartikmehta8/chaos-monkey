# Chaos Monkey

This is a Node.js + Express backend for a GUI wrapper around [autocannon](https://github.com/mcollina/autocannon), built for real-time load testing with logs, history, and SSE streaming.

## Features

- **Run load tests** against any HTTP endpoint with customizable parameters
- **Real-time logs** via Server-Sent Events (SSE)
- **In-memory history** of recent test runs
- **Parameter snapshot logging** (query params, payload, headers, etc.)

## API Endpoints

### POST `/run`
Start a new load test.

### GET `/status/:id`
Get progress of a test run.

### GET `/result/:id`
Get the final results once a run completes.

### GET `/logs/:id`
Retrieve logs for a run.

### GET `/logs/stream/:id`
SSE stream of logs in real time.

### GET `/history`
List recent runs.
