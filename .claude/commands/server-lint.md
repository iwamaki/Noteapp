---
description: Build server container and run mypy + ruff checks
---

Please build the server container and run linting checks (mypy and ruff) inside the container.

1. Start the server with Docker Compose in the background:
```bash
cd server && docker compose up --build
```
Run this with `run_in_background: true` and wait for the container to be ready (look for "Application startup complete" in the logs).

2. Once the container is running, run mypy type checking inside the container:
```bash
docker exec server-api-1 mypy src/
```

3. Run ruff linting inside the container:
```bash
docker exec server-api-1 ruff check
```

Report the results of both checks to the user. If there are errors, list them clearly.
