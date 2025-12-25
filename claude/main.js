/**
 * Claude Cloud Functions for Parse Server
 * Provides utilities for creating, reading, updating, and deleting tables
 * with public access permissions
 */

import Parse from 'parse';

/**
 * Initialize Parse with server configuration
 */
export function initializeParseServer(serverURL, appId, masterKey) {
  Parse.initialize(appId, undefined, masterKey);
  Parse.serverURL = serverURL;
}

/**
 * Create a new table (Parse Class) with public read/write permissions
 * @param {string} className - Name of the class/table to create
 * @param {Object} schema - Schema definition for the class
 * @returns {Promise<Object>} - Result of class creation
 */
export async function createTable(className, schema = {}) {
  try {
    const query = new Parse.Query(className);
    
    // Create a dummy object to ensure the class exists
    const obj = new Parse.Object(className);
    
    // Set public permissions
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    obj.setACL(acl);
    
    // Add schema fields if provided
    Object.keys(schema).forEach(key => {
      obj.set(key, schema[key]);
    });
    
    await obj.save(null, { useMasterKey: true });
    
    return {
      success: true,
      message: `Table '${className}' created successfully`,
      className: className
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      className: className
    };
  }
}

/**
 * Read records from a table
 * @param {string} className - Name of the class/table
 * @param {Object} filters - Query filters (optional)
 * @param {number} limit - Limit number of results (default: 100)
 * @returns {Promise<Array>} - Array of records
 */
export async function readTable(className, filters = {}, limit = 100) {
  try {
    const query = new Parse.Query(className);
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (typeof value === 'object' && value.operator) {
        // Handle operators like $gt, $lt, $eq, etc.
        switch (value.operator) {
          case '$gt':
            query.greaterThan(key, value.value);
            break;
          case '$lt':
            query.lessThan(key, value.value);
            break;
          case '$gte':
            query.greaterThanOrEqualTo(key, value.value);
            break;
          case '$lte':
            query.lessThanOrEqualTo(key, value.value);
            break;
          case '$ne':
            query.notEqualTo(key, value.value);
            break;
          case '$in':
            query.containedIn(key, value.value);
            break;
          default:
            query.equalTo(key, value);
        }
      } else {
        query.equalTo(key, value);
      }
    });
    
    query.limit(limit);
    const results = await query.find({ useMasterKey: true });
    
    return results.map(obj => obj.toJSON());
  } catch (error) {
    throw new Error(`Error reading table '${className}': ${error.message}`);
  }
}

/**
 * Create a new record in a table
 * @param {string} className - Name of the class/table
 * @param {Object} data - Data for the new record
 * @returns {Promise<Object>} - Created record with ID
 */
export async function createRecord(className, data) {
  try {
    const obj = new Parse.Object(className);
    
    // Set public permissions
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(true);
    obj.setACL(acl);
    
    // Set data
    Object.keys(data).forEach(key => {
      obj.set(key, data[key]);
    });
    
    await obj.save(null, { useMasterKey: true });
    
    return {
      success: true,
      id: obj.id,
      data: obj.toJSON()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update a record in a table
 * @param {string} className - Name of the class/table
 * @param {string} objectId - ID of the record to update
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - Updated record
 */
export async function updateRecord(className, objectId, data) {
  try {
    const query = new Parse.Query(className);
    const obj = await query.get(objectId, { useMasterKey: true });
    
    // Update data
    Object.keys(data).forEach(key => {
      obj.set(key, data[key]);
    });
    
    await obj.save(null, { useMasterKey: true });
    
    return {
      success: true,
      id: obj.id,
      data: obj.toJSON()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a record from a table
 * @param {string} className - Name of the class/table
 * @param {string} objectId - ID of the record to delete
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteRecord(className, objectId) {
  try {
    const query = new Parse.Query(className);
    const obj = await query.get(objectId, { useMasterKey: true });
    
    await obj.destroy({ useMasterKey: true });
    
    return {
      success: true,
      message: `Record '${objectId}' deleted successfully`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete an entire table
 * @param {string} className - Name of the class/table to delete
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteTable(className) {
  try {
    const query = new Parse.Query(className);
    const results = await query.find({ useMasterKey: true });
    
    // Delete all records
    await Parse.Object.destroyAll(results, { useMasterKey: true });
    
    return {
      success: true,
      message: `Table '${className}' deleted successfully`,
      recordsDeleted: results.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get table schema/structure
 * @param {string} className - Name of the class/table
 * @returns {Promise<Object>} - Table schema
 */
export async function getTableSchema(className) {
  try {
    const query = new Parse.Query(className);
    query.limit(1);
    const results = await query.find({ useMasterKey: true });
    
    if (results.length === 0) {
      return {
        className: className,
        fields: {},
        recordCount: 0
      };
    }
    
    const sampleRecord = results[0].toJSON();
    const fields = {};
    
    Object.keys(sampleRecord).forEach(key => {
      if (!['objectId', 'createdAt', 'updatedAt'].includes(key)) {
        fields[key] = typeof sampleRecord[key];
      }
    });
    
    // Get total count
    const countQuery = new Parse.Query(className);
    const count = await countQuery.count({ useMasterKey: true });
    
    return {
      className: className,
      fields: fields,
      recordCount: count
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all tables (classes) in the database
 * @returns {Promise<Array>} - Array of class names
 */
export async function listTables() {
  try {
    const query = new Parse.Query('_SCHEMA');
    const results = await query.find({ useMasterKey: true });
    
    const tables = results
      .map(obj => obj.get('className'))
      .filter(name => !name.startsWith('_'));
    
    return tables;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  initializeParseServer,
  createTable,
  readTable,
  createRecord,
  updateRecord,
  deleteRecord,
  deleteTable,
  getTableSchema,
  listTables
};
