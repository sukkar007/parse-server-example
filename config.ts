import { schemaDefinitions } from './cloud/schema.js';

export const config = {
  databaseURI:
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb+srv://flamingolive007:flamingolive007hhh@flamingo.kgp9mt9.mongodb.net/?appName=Flamingo',
  cloud: './cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'myMasterKey', //Add your master key here. Keep it secret!
  clientKey: process.env.CLIENT_KEY || 'myClientKey',
  restAPIKey: process.env.REST_API_KEY || 'myRestApiKey',
  javascriptKey: process.env.JAVASCRIPT_KEY || 'myJavascriptKey',
  serverURL: process.env.SERVER_URL || 'https://parse-server-example-o1ht.onrender.com/parse', // Don't forget to change to https if needed
  
  // -- الإعدادات العامة للأذونات --
  // هذا الإعداد يسمح لجميع المستخدمين بقراءة جميع الكائنات بشكل افتراضي
  defaultPublicReadAccess: true,
  // هذا الإعداد يمنع المستخدمين من الكتابة أو التعديل على الكائنات بشكل عام
  defaultPublicWriteAccess: true,

  liveQuery: {
    classNames: ['Posts', 'Notifications', 'Comments', 'Streaming', '_User', 'Installation'], // List of classes to support for query subscriptions
  },
  schema: {
    definitions: schemaDefinitions,
    lockSchemas: false,
    strict: false,
    recreateModifiedFields: false,
    deleteExtraFields: false,
  },
  dashboardUsers: [
    {
      user: process.env.DASHBOARD_USER || 'admin',
      pass: process.env.DASHBOARD_PASS || 'admin123',
    },
  ],
};
