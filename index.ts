import express, { Request, Response, NextFunction } from 'express';
import { ParseServer } from 'parse-server';
import ParseDashboard from 'parse-dashboard';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import Parse from 'parse';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Enable CORS and public permissions
app.use((req: Request, res: Response, next: NextFunction) => {
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
  allowCustomObjectId: true,
  enforcePrivateUsers: false,
  // Enable full public access to all classes - no restrictions
  classLevelPermissions: {
    '*': {
      'find': { '*': true },           // جميع المستخدمين يمكنهم البحث
      'count': { '*': true },          // جميع المستخدمين يمكنهم العد
      'get': { '*': true },            // جميع المستخدمين يمكنهم الحصول على السجلات
      'create': { '*': true },         // جميع المستخدمين يمكنهم إنشاء سجلات
      'update': { '*': true },         // جميع المستخدمين يمكنهم تعديل السجلات
      'delete': { '*': true },         // جميع المستخدمين يمكنهم حذف السجلات
      'addField': { '*': true }        // جميع المستخدمين يمكنهم إضافة أعمدة جديدة
    }
  },
  // تعطيل فحص الأمان للسماح بالوصول الكامل
  revokeSessionOnPasswordChange: false,
  // السماح بتعديل schema بدون قيود
  schemaCacheTTL: 5000,
});

server.start().then(() => {
  app.use(mountPath, server.app);
});

// Parse Dashboard - إدارة البيانات عبر الواجهة الرسومية
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
app.get('/', (req: Request, res: Response) => {
  res.status(200).send(`
    <h1>Parse Server is Running!</h1>
    <p><a href="/parse">Parse API</a></p>
    <p><a href="/dashboard">Parse Dashboard</a></p>
    <p><a href="/test">Test Page</a></p>
  `);
});

app.get('/test', (req: Request, res: Response) => {
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
