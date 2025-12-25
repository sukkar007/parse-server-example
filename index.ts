const express = require('express');
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const path = require('path');
const http = require('http');
const { config } = require('./config.js');

const __dirname = path.resolve();
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Parse-Application-Id, X-Parse-REST-API-Key, X-Parse-Master-Key, X-Parse-Session-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, '/public')));

// Parse Server
const mountPath = process.env.PARSE_MOUNT || '/parse';
const server = new ParseServer({
  ...config,
  allowClientClassCreation: true,
});
server.start().then(() => {
  app.use(mountPath, server.app);
});

// Parse Dashboard
const dashboard = new ParseDashboard({
  apps: [
    {
      serverURL: config.serverURL,
      appId: config.appId,
      masterKey: config.masterKey,
      appName: 'Parse Server',
    },
  ],
  users: [
    {
      user: process.env.DASHBOARD_USER || 'admin',
      pass: process.env.DASHBOARD_PASS || 'admin123',
    },
  ],
}, true);
app.use('/dashboard', dashboard);

// Routes
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

// Live Query
ParseServer.createLiveQueryServer(httpServer);
