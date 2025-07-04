console.log('🔥 STARTING - Basic test');

// Test basic functionality first
console.log('✅ Basic console.log works');

try {
  console.log('🧪 About to import express...');
  const express = require('express');
  console.log('✅ Express imported successfully');
  
  console.log('🧪 About to create app...');
  const app = express();
  console.log('✅ Express app created');
  
  console.log('🧪 About to start server...');
  const PORT = 4000;
  
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'OK', service: 'backend-main' });
  });
  
  app.listen(PORT, () => {
    console.log('🎉 SERVER IS RUNNING!');
    console.log(`📍 http://localhost:${PORT}`);
  });
  
  console.log('✅ Server setup complete');
  
} catch (error) {
  console.error('❌ Error occurred:', error);
}