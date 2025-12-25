import { schemaDefinitions } from './cloud/schema.js';

export const config = {
  databaseURI:
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dev',
  cloud: './cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', // ضع Master Key الخاص بك
  clientKey: process.env.CLIENT_KEY || 'myClientKey',
  restAPIKey: process.env.REST_API_KEY || 'myRestApiKey',
  javascriptKey: process.env.JAVASCRIPT_KEY || 'myJavascriptKey',
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',

  // منح كل الصلاحيات للمستخدمين
  classLevelPermissions: {
    '*': {
      find: { '*': true },
      count: { '*': true },
      get: { '*': true },
      create: { '*': true },
      update: { '*': true },
      delete: { '*': true },
      addField: { '*': true },
    },
  },
  allowClientClassCreation: true,
  allowCustomObjectId: true,
  enforcePrivateUsers: false,
  revokeSessionOnPasswordChange: false,

  liveQuery: {
    classNames: ['Posts', 'Comments', 'Streaming', 'User', 'Installation'], 
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
