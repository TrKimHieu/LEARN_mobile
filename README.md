# LEARN mobile

Standalone private mobile repository. Public contracts 1.0.0 are pinned in vendor/ with SHA-256. No backend or other client checkout is required.

Setup: npm ci, npm run lint, npm run typecheck, npm test, npm run export.

Copy .env.example to .env and set an explicit EXPO_PUBLIC_API_URL origin. Set APP_ENV to development, preview or production. Preview and production require remote HTTPS; API paths already include /api/v1. The example API is a build placeholder. No Metro/LAN origin is inferred.

Run `npm run sync:contracts` before installation and `npm run test:tooling` alongside the checks above. To restore the pinned artifact from a released file: `npm run sync:contracts -- --source /path/to/released.tgz`. Hash and package identity must match the trusted pin. Run typecheck and mock tests after every contract update.

New original-file imports are temporarily locked while the on-device text-only pipeline is prepared. Existing documents and lessons remain readable.

EAS channels are development/preview/production. Preview and production builds point to the staging backend `https://3-107-190-42.sslip.io` (backend `APP_URL`) via `eas.json` env; change it there when the domain changes. Verify the configured Expo project/owner before building. Development client dependencies and signing still need setup. Native dependency changes need a new binary; runtime uses fingerprint policy. APK: `npm run build:apk`; web export does not validate a native binary.

See [roadmap status and outstanding acceptance gates](docs/mobile-roadmap-status.md).
