export const config = {
  databaseURI:
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dev',
  cloud: './cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '',
  clientKey: process.env.CLIENT_KEY || 'myClientKey',
  restAPIKey: process.env.REST_API_KEY || 'myRestApiKey',
  javascriptKey: process.env.JAVASCRIPT_KEY || 'myJavascriptKey',
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',

  liveQuery: {
    classNames: ['Posts', 'Comments', 'Streaming', 'User', 'Installation'],
  },

  // 🔓 هذا هو المفتاح لتمكين إنشاء أي Class تلقائيًا
  clientClassCreation: true,

  dashboardUsers: [
    {
      user: process.env.DASHBOARD_USER || 'admin',
      pass: process.env.DASHBOARD_PASS || 'admin123',
    },
  ],

  // ❌ لا تستخدم schemaDefinitions، حتى يمكن إنشاء أي Class تلقائيًا
  // schema: {...}  ← احذف تمامًا
};
