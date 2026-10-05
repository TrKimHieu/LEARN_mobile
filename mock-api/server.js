'use strict';
/**
 * Chạy API mock:  npm run mock
 *
 * Biến môi trường (đều tuỳ chọn):
 *   PORT              cổng lắng nghe, mặc định 4000 (app tự tìm API ở <IP máy chạy Metro>:4000)
 *   MOCK_LATENCY_MS   độ trễ giả cho mỗi request, vd. 800 để thấy trạng thái "Đang tải"
 *   MOCK_ACCESS_TTL_S thời hạn access token (giây), mặc định 900; đặt 20 để thử tự làm mới phiên
 *   MOCK_JOB_MS       thời gian chạy một AI Job giả (ms), mặc định 6000
 */
const os = require('node:os');
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 4000;
const { server } = createApp({
  latencyMs: Number(process.env.MOCK_LATENCY_MS) || 0,
  accessTtlMs: (Number(process.env.MOCK_ACCESS_TTL_S) || 900) * 1000,
  jobMs: Number(process.env.MOCK_JOB_MS) || 6000,
  log: (line) => console.log(line),
});

server.listen(port, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log('\nAPI MOCK của LEARN đang chạy (dữ liệu trong bộ nhớ, mất khi tắt)');
  console.log(`  Máy này     : http://localhost:${port}`);
  for (const ip of lan) console.log(`  Mạng LAN    : http://${ip}:${port}`);
  console.log('  Tài khoản   : demo@learn.ai / Demo@12345   ·   admin@learn.ai / Admin@12345');
  console.log('  Đặt lại dữ liệu: POST /__mock/reset\n');
});
