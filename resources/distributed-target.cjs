const http = require('node:http');

let plannedRequests = 0;
const server = http.createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (request.method === 'GET' && path === '/load') {
    plannedRequests += 1;
    console.log(`Planned requests: ${plannedRequests}`);
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ plannedRequests }));
});

server.on('error', error => {
  console.error(`Local target could not start: ${error.code}`);
  process.exitCode = 1;
});
server.listen(Number(process.env.LPS_DEMO_PORT || 8119), '127.0.0.1', () => {
  console.log(`Local target: http://127.0.0.1:${server.address().port}`);
});

module.exports = server;