import express from 'express';
import { ParseServer } from 'parse-server';
import ParseDashboard from 'parse-dashboard';
import path from 'path';
import http from 'http';
import { config } from './config.js';

const __dirname = path.resolve();
const app = express();

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Parse-Application-Id, X-Parse-REST-API-Key, X-Parse-Master-Key, X-Parse-Session-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static assets
app.use('/public', express.static(path.join(__dirname, '/public')));

// Parse Server
const mountPath = process.env.PARSE_MOUNT || '/parse';
const server = new ParseServer(config);
await server.start();
app.use(mountPath, server.app);

// Parse Dashboard
const dashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',
        appId: process.env.APP_ID || 'myAppId',
        masterKey: process.env.MASTER_KEY || '',
        appName: 'Parse Server',
      },
    ],
    users: [
      {
        user: process.env.DASHBOARD_USER || 'admin',
        pass: process.env.DASHBOARD_PASS || 'admin123',
      },
    ],
  },
  true
);
app.use('/dashboard', dashboard);

// Default routes
app.get('/', (req, res) => {
  res.status(200).send(`
    <h1>Parse Server is Running!</h1>
    <p><a href="/parse">Parse API</a></p>
    <p><a href="/dashboard">Parse Dashboard</a></p>
    <p><a href="/test">Test Page</a></p>
  `);
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

// Start HTTP server
const port = process.env.PORT || 1337;
const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log('Parse Server running on port ' + port);
});

// Enable Live Query (ضع أسماء الكلاسات التي تريد دعمها هنا)
await ParseServer.createLiveQueryServer(httpServer);
console.log(`Visit http://localhost:${port}/dashboard to access Parse Dashboard`);
console.log(`Visit http://localhost:${port}/test to check the Parse Server`);
