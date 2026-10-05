// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Ba rule của React Compiler bắt các mẫu Animated/ref đang chạy đúng trong app
    // (useRef(new Animated.Value()).current, Date.now() khi render...). Để cảnh báo,
    // dọn dần khi thiết kế lại giao diện — chưa thể kiểm bằng điện thoại thật.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
