// config.js
export const config = {
  // قاعدة البيانات
  databaseURI:
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dev',

  // Cloud Code
  cloud: './cloud/main.js',

  // مفاتيح التطبيق
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'myMasterKey', // يجب إبقاؤه سريًا
  clientKey: process.env.CLIENT_KEY || 'myClientKey',
  restAPIKey: process.env.REST_API_KEY || 'myRestApiKey',
  javascriptKey: process.env.JAVASCRIPT_KEY || 'myJavascriptKey',

  // عنوان السيرفر
  serverURL: process.env.SERVER_URL || 'https://parse-server-example-o1ht.onrender.com/parse',

  // Live Query
  liveQuery: {
    classNames: ['Posts', 'Comments', 'Streaming', 'User', 'Installation'], 
    // يمكنك إضافة أي كلاس آخر تريد دعم Live Query له
    // ⚠️ لا تستخدم '*' لأنه يسبب SyntaxError
  },

  // ⚠️ ملاحظة: clientClassCreation و dashboardUsers لا توضع هنا
  // لتفعيل إنشاء أي Class تلقائي، استخدم allowClientClassCreation عند إنشاء ParseServer

  // صلاحيات عامة للجميع
  // السماح للجميع بإنشاء وقراءة وتعديل وحذف الجداول
  publicPermissions: {
    create: true,
    read: true,
    update: true,
    delete: true
  },

  // إعدادات الأمان
  enforcePrivateUsers: false,
  allowClientClassCreation: true,
  allowCustomObjectId: true,
};
