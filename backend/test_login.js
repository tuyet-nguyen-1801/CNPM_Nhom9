require('dotenv').config();
const http = require('http');

function testLogin(email, password) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ email, password });
    const opts = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const json = JSON.parse(data);
        console.log(`[${email}] status=${res.statusCode} success=${json.success} msg=${json.message || '—'} token=${json.token ? '✅ có token' : '—'}`);
        resolve(json);
      });
    });
    req.on('error', e => { console.log(`[${email}] ❌ Server không chạy: ${e.message}`); resolve(null); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Test đăng nhập trực tiếp API ===\n');
  await testLogin('admin@phonestore.vn',    'Admin@123');
  await testLogin('lan.tran@phonestore.vn', 'Nhanvien@1');
  await testLogin('hung.le@phonestore.vn',  'Nhanvien@1');
  await testLogin('admin@phonestore.vn',    'SaiMatKhau');
}
main();
