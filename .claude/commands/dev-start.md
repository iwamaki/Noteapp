---
description: Start development environment (server + Expo frontend)
---

Please start the development environment by running both the server and Expo frontend in the background, and prepare to monitor their logs.

1. Start the server with Docker Compose:
```bash
cd server && docker compose up --build
```

2. Start the Expo development server with tunnel mode (redirect output to expo.log):
```bash
npx expo start --tunnel 2>&1 | tee expo.log
```

Both commands should be run in the background using `run_in_background: true`. After starting both services, inform the user that they can use the following commands to monitor logs:
- `/logs-recent` - Server logs
- `/logs-frontend-recent` - Expo logs
- `/logs-errors` - Server errors
- `/logs-frontend-errors` - Expo errors
