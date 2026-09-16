# Contract test fixtures

Capture JSON responses from EduPlatform API handlers (or `moynamoti-main` reference routes) and add schema/snapshot tests here before production deploy.

Suggested workflow:

1. Run handler against seed DB or export from staging.
2. Save under `fixtures/<route-path>.json`.
3. Add a `*.test.ts` that validates shape keys and status codes.
