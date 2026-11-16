# LEARN mobile

Standalone private mobile repository. Public contracts 1.0.0 are pinned in vendor/ with SHA-256. No backend or other client checkout is required.

Setup: npm ci, npm run lint, npm run typecheck, npm test, npm run export. Adding dependencies: see [docs/dependencies.md](docs/dependencies.md).

Copy .env.example to .env and set an explicit EXPO_PUBLIC_API_URL origin. Set APP_ENV to development, preview or production. Preview and production require remote HTTPS; API paths already include /api/v1. The example API is a build placeholder. No Metro/LAN origin is inferred.

Run `npm run sync:contracts` before installation and `npm run test:tooling` alongside the checks above. To restore the pinned artifact from a released file: `npm run sync:contracts -- --source /path/to/released.tgz`. Hash and package identity must match the trusted pin. Run typecheck and mock tests after every contract update.

New original-file imports are temporarily locked while the on-device text-only pipeline is prepared. Existing documents and lessons remain readable.

EAS channels are development/preview/production. Preview and production builds point to the staging backend `https://3-107-190-42.sslip.io` (backend `APP_URL`) via `eas.json` env; change it there when the domain changes. Verify the configured Expo project/owner before building. Development client dependencies and signing still need setup. Native dependency changes need a new binary; runtime uses fingerprint policy. APK: `npm run build:apk`; web export does not validate a native binary.

See [roadmap status and outstanding acceptance gates](docs/mobile-roadmap-status.md).

## Testing without a backend

When the API is unreachable or returns a server error, the app shows “Sản phẩm đang không kết nối được với server” with **Thử lại** and **Testing**. Requests time out after 8 seconds. Testing opens a local demo account with seeded courses, lessons, exercises, review cards, progress and subscription screens. Course creation, text import and simulated lesson generation work in memory, without starting `npm run mock`. AI content and payment flows are simulated.

The Testing banner stays visible. **Thoát Testing** discards demo changes and restores the normal session flow. Demo tokens never replace saved credentials, and demo data is excluded from account SQLite caches and the synchronization outbox. Reloading the app also ends Testing.

With Metro running (`npm run web`), run `npm run e2e:offline` to verify the outage/Testing flow in Playwright. Set `E2E_BASE` when using a port other than 8081. The script blocks API requests itself, checks that Testing sends none, and saves screenshots in `e2e/out/`. It uses installed Chromium, or Microsoft Edge on Windows; `E2E_BROWSER_CHANNEL` can select another installed browser channel.

For Android without QR scanning, start an Android Studio virtual device and run `npm run android`. This requires Android SDK Platform-Tools (`adb`) and Android Emulator, with `ANDROID_HOME` pointing to the installed SDK. If native dependencies are not present in the installed client, use a matching development build. `npm run web` provides a quick browser preview; it does not verify native OCR or SQLite behavior.
