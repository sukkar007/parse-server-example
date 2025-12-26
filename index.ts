
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
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
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
        masterKey: process.env.MASTER_KEY || 'myMasterKey',
        clientKey: process.env.CLIENT_KEY || 'myClientKey',
        appName: 'Parse Server',
      },
    ],
    users: config.dashboardUsers,
  },
  true
);
app.use('/dashboard', dashboard);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function (req, res) {
  res.status(200).send(`
    <h1>Parse Server is Running!</h1>
    <p><a href="/parse">Parse API</a></p>
    <p><a href="/dashboard">Parse Dashboard</a></p>
    <p><a href="/test">Test Page</a></p>
  `);
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

const port = process.env.PORT || 1337;
const httpServer = http.createServer(app);
httpServer.listen(port, function () {
  console.log('parse-server-example running on port ' + port + '.');
});
// This will enable the Live Query real-time server
await ParseServer.createLiveQueryServer(httpServer);
console.log(`Visit http://localhost:${port}/test to check the Parse Server`);
console.log(`Visit http://localhost:${port}/dashboard to access Parse Dashboard`);
