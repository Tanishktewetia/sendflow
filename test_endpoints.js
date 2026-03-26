// Simple endpoint test to verify backend is responding
const http = require('http');

// Test data - you'll need to get a real JWT token from the app
const testJWT = 'test_token'; // This will fail but shows the endpoint responds

console.log('Testing Backend Endpoints on port 8081...\n');

// Test 1: GET /api/users/profile
console.log('TEST 1: GET /api/users/profile');
const options1 = {
  hostname: 'localhost',
  port: 8081,
  path: '/api/users/profile',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${testJWT}`,
    'Content-Type': 'application/json'
  }
};

const req1 = http.request(options1, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}\n`);
  });
});

req1.on('error', (e) => {
  console.log(`❌ Connection Error: ${e.message}\n`);
});

req1.setTimeout(3000, () => {
  req1.destroy();
  console.log('❌ Request Timeout - Backend not responding\n');
});

req1.end();

// Test 2: Try to PUT /api/users/profile
setTimeout(() => {
  console.log('TEST 2: PUT /api/users/profile');
  const putData = JSON.stringify({ fullName: 'Test User' });
  
  const options2 = {
    hostname: 'localhost',
    port: 8081,
    path: '/api/users/profile',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${testJWT}`,
      'Content-Type': 'application/json',
      'Content-Length': putData.length
    }
  };

  const req2 = http.request(options2, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}\n`);
      process.exit(0);
    });
  });

  req2.on('error', (e) => {
    console.log(`❌ Connection Error: ${e.message}\n`);
    process.exit(1);
  });

  req2.setTimeout(3000, () => {
    req2.destroy();
    console.log('❌ Request Timeout - Backend not responding\n');
    process.exit(1);
  });

  req2.write(putData);
  req2.end();
}, 3000);
