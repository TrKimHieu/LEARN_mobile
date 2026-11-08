import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const configure = require('../../app.config.js');
const base = require('../../app.json').expo;

test('release build cannot be downgraded by APP_ENV', () => {
  const previous = { ...process.env };
  try {
    process.env.EAS_BUILD_PROFILE = 'preview';
    process.env.APP_ENV = 'development';
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4000';
    assert.throws(() => configure({ config: base }), /APP_ENV.*profile/);
  } finally { process.env = previous; }
});
test('channels and update target agree with the checked-in project', () => {
  const eas = require('../../eas.json');
  for (const environment of ['development', 'preview', 'production']) {
    assert.equal(eas.build[environment].channel, environment);
    assert.equal(eas.build[environment].env.APP_ENV, environment);
  }
  assert.equal(base.updates.url, `https://u.expo.dev/${base.extra.eas.projectId}`);
  assert.equal(base.runtimeVersion.policy, 'fingerprint');
});
