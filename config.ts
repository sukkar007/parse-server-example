// config.js
export const config = {
  // قاعدة البيانات
  databaseURI:
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dev',

  // Cloud Code
  cloud: './cloud/main.js',

  // مفاتيح التطبيق
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', // يجب إبقاؤه سريًا
  clientKey: process.env.CLIENT_KEY || 'myClientKey',
  restAPIKey: process.env.REST_API_KEY || 'myRestApiKey',
  javascriptKey: process.env.JAVASCRIPT_KEY || 'myJavascriptKey',

  // عنوان السيرفر
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',

  // Live Query
  liveQuery: {
    classNames: ['Posts', 'Comments', 'Streaming', 'User', 'Installation'], 
    // يمكنك إضافة أي كلاس آخر تريد دعم Live Query له
    // ⚠️ لا تستخدم '*' لأنه يسبب SyntaxError
  },

  // ⚠️ ملاحظة: clientClassCreation و dashboardUsers لا توضع هنا
  // لتفعيل إنشاء أي Class تلقائي، استخدم allowClientClassCreation عند إنشاء ParseServer
};
