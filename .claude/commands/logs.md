---
description: Flexible log viewer with category filtering (usage: /logs [frontend|backend] [category] [errors])
---

Please analyze the user's request context and show relevant logs with intelligent filtering.

**Arguments parsing:**
- If `{{args}}` contains "frontend" or "expo": Show frontend logs
- If `{{args}}` contains "backend" or "server": Show backend logs
- If `{{args}}` contains "errors" or "error": Filter to ERROR level only
- If `{{args}}` contains a category name: Filter by that category
- If no args or unclear: Ask user to clarify or show recent logs from both

**Frontend categories (from logger.ts):**
chat, chatService, system, file, diff, llm, rag, default, tree, platformInfo, toolService, editFileHandler, createDirectoryHandler, deleteItemHandler, moveItemHandler, itemResolver, websocket, clientId, subscriptionSync, billingApi, billing, auth, api, httpClient, init

**Backend categories (from logger.py):**
auth, billing, llm, tool, chat, config, websocket, vectorstore, document, startup, api, default

**Command examples (tested and verified):**

1. Frontend logs for a specific category:
```bash
# Extract LOG lines, parse JSON, filter by category, format output
if [ -f expo.log ]; then
  grep '^ *LOG ' expo.log | sed 's/^ *LOG *//' | jq --arg cat "CATEGORY" 'select(.category==$cat) | "[\(.level)] [\(.category)] \(.message)"' -r | tail -50
else
  echo "No expo.log file found. Run: npx expo start --tunnel 2>&1 | tee expo.log"
fi
```

2. Frontend errors only:
```bash
# Extract LOG lines, parse JSON, filter ERROR level, format output
if [ -f expo.log ]; then
  grep '^ *LOG ' expo.log | sed 's/^ *LOG *//' | jq 'select(.level=="ERROR") | "[\(.level)] [\(.category)] \(.message)"' -r | tail -50
else
  echo "No expo.log file found."
fi
```

3. Frontend errors for a specific category:
```bash
# Extract LOG lines, parse JSON, filter by category AND error level, format output
if [ -f expo.log ]; then
  grep '^ *LOG ' expo.log | sed 's/^ *LOG *//' | jq --arg cat "CATEGORY" 'select(.category==$cat and .level=="ERROR") | "[\(.level)] [\(.category)] \(.message)"' -r | tail -50
else
  echo "No expo.log file found."
fi
```

4. Frontend all logs (recent):
```bash
# Extract all LOG lines, parse JSON, format output
if [ -f expo.log ]; then
  grep '^ *LOG ' expo.log | sed 's/^ *LOG *//' | jq -r '"[\(.level)] [\(.category)] \(.message)"' | tail -50
else
  echo "No expo.log file found."
fi
```

5. Frontend logs WITH timestamp (when investigating timing issues):
```bash
# Include timestamp for timing analysis
if [ -f expo.log ]; then
  grep '^ *LOG ' expo.log | sed 's/^ *LOG *//' | jq -r '"\(.timestamp) [\(.level)] [\(.category)] \(.message)"' | tail -50
else
  echo "No expo.log file found."
fi
```

6. Backend logs (recent):
```bash
# Extract JSON lines from docker logs, format output
docker logs server-api-1 --tail 50 2>&1 | grep '^{' | jq -r '"[\(.level)] [\(.logger)] \(.message)"'
```

7. Backend errors only:
```bash
# Extract JSON lines, filter ERROR level, format output
docker logs server-api-1 --tail 100 2>&1 | grep '^{' | jq 'select(.level=="ERROR") | "[\(.level)] [\(.logger)] \(.message)"' -r
```

8. Backend logs by logger name:
```bash
# Extract JSON lines, filter by logger name, format output
docker logs server-api-1 --tail 100 2>&1 | grep '^{' | jq --arg logger "LOGGER_NAME" 'select(.logger | contains($logger)) | "[\(.level)] [\(.logger)] \(.message)"' -r
```

**Instructions:**
1. Parse the arguments to understand what the user wants
2. If the request mentions a specific category/logger, use that filter
3. If the request is about errors, add error level filtering
4. If unclear, show recent logs from both frontend and backend
5. By default, use the format WITHOUT timestamps: `"[\(.level)] [\(.category)] \(.message)"`
6. Only include timestamps when investigating timing/performance issues or when explicitly requested
7. Always provide a summary of what you found and suggest related categories if relevant
