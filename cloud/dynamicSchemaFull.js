// ./cloud/dynamicSchemaFull.js
import Parse from 'parse/node';

// دالة لإنشاء أي Class بشكل ديناميكي
async function ensureClass(className, fields = {}) {
  const schema = new Parse.Schema(className);

  // إضافة الحقول تلقائيًا
  for (const [fieldName, fieldType] of Object.entries(fields)) {
    try {
      if (fieldType === 'String') schema.addString(fieldName);
      else if (fieldType === 'Number') schema.addNumber(fieldName);
      else if (fieldType === 'Boolean') schema.addBoolean(fieldName);
      else if (fieldType === 'Array') schema.addArray(fieldName);
      else if (fieldType === 'File') schema.addFile(fieldName);
      else schema.addPointer(fieldName, fieldType); // أي Class آخر
    } catch (err) {
      // الحقل موجود مسبقًا، تخطي
    }
  }

  // منح صلاحيات كاملة
  schema.setCLP({
    find: { '*': true },
    get: { '*': true },
    create: { '*': true },
    update: { '*': true },
    delete: { '*': true },
  });

  try {
    await schema.save({ useMasterKey: true });
    console.log(`Class ${className} created/updated successfully`);
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error(`Error creating class ${className}:`, err.message);
    }
  }
}

// Hook قبل الحفظ لأي Object
Parse.Cloud.beforeSave(async (request) => {
  const obj = request.object;
  const className = obj.className;

  // توليد الحقول بشكل ديناميكي
  const fields = {};
  const data = obj.toJSON();
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value === null || value === undefined) fields[key] = 'String';
    else if (typeof value === 'number') fields[key] = 'Number';
    else if (typeof value === 'boolean') fields[key] = 'Boolean';
    else if (Array.isArray(value)) fields[key] = 'Array';
    else if (typeof value === 'object' && value.__type === 'File') fields[key] = 'File';
    else if (typeof value === 'object' && value.__type === 'Pointer') fields[key] = value.className;
    else fields[key] = 'String';
  }

  await ensureClass(className, fields);
});
