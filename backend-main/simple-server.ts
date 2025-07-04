console.log('Starting simple server...');

const express = require('express');
const app = express();

console.log('Express loaded');

app.get('/test', (req: any, res: any) => {
  res.send('Hello World!');
});

console.log('Route created');

app.listen(3000, () => {
  console.log('Server running on port 3000!');
});

console.log('Server setup done');
