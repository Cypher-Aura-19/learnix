const http = require('http');

const data = JSON.stringify({
  user_email: 'work.talharizwan@gmail.com',
  course_title: 'Test Web Development Course',
  student_name: 'Talha'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/send-onboarding',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
