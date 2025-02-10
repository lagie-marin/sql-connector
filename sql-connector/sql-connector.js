const mysql = require("mysql2");
const { error, logs, sql } = require("./Logger");
let client = {};

const sqlType = {
    String: "String",
    Number: "Number",
    Boolean: "Boolean",
    Date: "Date",
    Object: "Object",
    Array: "Array",
    Now: "Now",
    Float: "Float",
    Text: "Text",
    DateTime: "DateTime",
    Timestamp: "Timestamp",
};

const sqlTypeMap = {
    String: 'VARCHAR',
    Number: 'INT',
    Boolean: 'BOOLEAN',
    Date: 'DATETIME',
    Object: 'JSON',
    Array: 'VARCHAR',
    Now: 'NOW()',
    Float: 'FLOAT',
    Text: 'TEXT',
    DateTime: "DATETIME",
    Timestamp: "TIMESTAMP",
};

/**
 * Represents a database schema.
 * 
 * @example
 * const transferSchema = new Schema({
 *     token: {
 *         type: String,
 *         length: 50
 *     },
 *     mdp: {
 *         type: String,
 *         length: 15
 *     }
 * });
 */
class Schema {
    constructor(schemaDict) {
        this.schemaDict = schemaDict;
    }
}

let connexion = null;

/**
 * Establishes a connection to the database using a given configuration.
 * @param {Object} config Database connection configuration.
 * @param {string} config.host The database host.
 * @param {number} config.port The database port.
 * @param {string} config.user The username for the connection.
 * @param {string} config.password The password for the connection.
 * @param {string} config.database The name of the database.
 * @returns {Promise<void>} A promise that resolves when the connection is established.
 * 
 * @example
 * const config = {
 *   host: 'localhost',
 *   port: 6666,
 *   user: 'root',
 *   password: 'password',
 *   database: 'mydatabase'
 * };
 * await connect(config);
 */
async function connect(config) {
    connexion = mysql.createPool(config);
}

/**
 * Closes the database connection.
 * This function terminates the active database connection and records a logging message
 * indicating whether the shutdown succeeded or failed.
 * 
 * @returns {Promise<void>} A promise that resolves when the connection is closed.
 *
 * @example
 * await logout();
 */
async function logout() {
    connexion.end(err => {
        if (err) {
            error(`Error closing database connection: ${err}`);
            return;
        }

        logs("Database connection closed");
    });
}

/**
 * Generates an SQL_request condition from a filter object.
 * 
 * @param {Object} filter An object containing the key-value pairs to use to generate the condition.
 * @param {boolean} [isUpdate=false] A flag to determine whether the condition is used in an update request.
 * @returns {string} A character string representing the generated SQL_request condition.
 * 
 * @example
 * const filter = { id: 1, name: "John" };
 * const condition = generateCondition(filter);
 * console.log(condition); // 'id = 1 AND name = "John"'
 *
 * @example
 * const filter = { id: 1, name: "John" };
 * const condition = generateCondition(filter, true);
 * console.log(condition); // 'id = 1, name = "John"'
 */
function generateCondition(filter, isUpdate = false)
{
    const keys = Object.keys(filter);
    const values = Object.values(filter);

    const conditions = keys.map((key, index) => {
        const value = values[index];

        if ((value === null || value === "null") && isUpdate == false) return `${key} IS NULL`;
        return `${key} = ${typeof value === "string" ? `"${value}"` : value}`;
    }).join(` ${isUpdate == false ? "AND" : ","} `);

    return conditions;
}

function generateValueSQL(value) {
    return value.map(item => {
        if (typeof item === "string") return `"${item.replace(/"/g, '\\"')}"`;
        if (typeof item === "object") return `"${item}"`;
        return item;
    }).join(", ");
}

function formatObject(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === "string")
                obj[key] = `${value.replace(/"/g, '\\"')}`;
            if (typeof value === "object")
                obj[key] = `${value}`;
        }
    }
    return obj;
}

/**
 * Replaces values ​​from one dictionary with those from another dictionary if the keys match.
 * @param {Object} dict The original dictionary containing the values ​​to replace.
 * @param {Object} replacementDict The dictionary containing the replacement values.
 * @returns {Object} A new dictionary with the replaced values.
 * 
 * @example
 * const dict = { a: 1, b: 2, c: 3 };
 * const replacementDict = { b: 20, c: 30 };
 * const result = replaceValues(dict, replacementDict);
 * console.log(result); // { a: 1, b: 20, c: 30 }
 */
function replaceValues(dict, replacementDict) {
    const resultDict = {};

    for (const key in dict) {
        if (key in replacementDict) resultDict[key] = replacementDict[key];
        else resultDict[key] = dict[key];
    }

    return resultDict;
}

const reservedKeywords = ['ADD', 'ALL', 'ALTER', 'AND', 'AS', 'ASC', 'BETWEEN', 'BY', 'CASE', 'CHECK', 'COLUMN', 'CONSTRAINT', 'CREATE', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DEFAULT', 'DELETE', 'DESC', 'DISTINCT', 'DROP', 'ELSE', 'END', 'ESCAPE', 'EXCEPT', 'EXISTS', 'FOR', 'FOREIGN', 'FROM', 'FULL', 'GROUP', 'HAVING', 'IN', 'INNER', 'INSERT', 'INTERSECT', 'INTO', 'IS', 'JOIN', 'LEFT', 'LIKE', 'LIMIT', 'NOT', 'NULL', 'ON', 'OR', 'ORDER', 'OUTER', 'PRIMARY', 'REFERENCES', 'RIGHT', 'SELECT', 'SET', 'SOME', 'TABLE', 'THEN', 'UNION', 'UNIQUE', 'UPDATE', 'VALUES', 'WHEN', 'WHERE'];

/**
 * Checks if a table name is a reserved keyword.
 * 
 * @param {string} tableName Le nom de la table à vérifier.
 * @returns {boolean} `true` si le nom de la table est un mot-clé réservé, sinon `false`.
 * 
 * @example
 * const isReserved = ifReservedKeywords('SELECT');
 * console.log(isReserved); // true
 *
 * @example
 * const isReserved = ifReservedKeywords('myTable');
 * console.log(isReserved); // false
 */
function ifReservedKeywords(tableName) {
    if (reservedKeywords.includes(tableName.toUpperCase())) {
        return true;
    }
    return false;
}

function getFieldType(field) {
    if (typeof field === "object") {
        if (field.type.name !== undefined) return field.type.name;
        else return field.type;
    } else {
        if (field.name !== undefined) return field.name;
        else return field;
    }
}

/**
 * Represents a database model.
 * @class
 */
class Model {
    static sqlTypeMap = sqlTypeMap;
    /**
     * Creates an instance of Model.
     * @param {string} name The name of the database table.
     * @param {Object} schema The schema of the database table.
     */
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;

        connexion.query(this.generateCreateTableStatement(schema.schemaDict), (err) => {
            if (err) {
                error(`Error creating table: ${err} with table name: ${this.name}`);
                return;
            }
            logs(`La table ${this.name} a été créé`);
        });
    }

    /**
     * Generates an SQL_request statement to create a table based on the provided schema.
     * 
     * @param {Object} schema The schema of the database table.
     * @returns {string} A character string representing the SQL_request statement to create the table.
     */
    generateCreateTableStatement(schema) {
        let foreignKey = [];
        const columns = Object.keys(schema).map(fieldName => {
            const field = schema[fieldName];
            let lengthDefault = 255;

            if (!field.type && typeof field == "object") throw new Error(`Field ${fieldName} has no type defined.`);
            
            const fieldType = getFieldType(field);

            if (field.type && typeof field == "object") {
                if (!sqlTypeMap[fieldType]) throw new Error(`Field ${fieldName} has unsupported type ${fieldType}.`);

                let columnDefinition = `${fieldName} ${sqlTypeMap[fieldType]}${sqlTypeMap[fieldType] == "VARCHAR" || sqlTypeMap[fieldType] == "INT" ? `(${field.length > 0 ? field.length : lengthDefault})` : ""}`;

                if (field.required) columnDefinition += ' NOT NULL';
                if (field.default !== undefined && field.default != null) columnDefinition += ` DEFAULT "${field.default}"`;
                if (field.default === null) columnDefinition += ` DEFAULT NULL`;
                if (field.unique) columnDefinition += ' UNIQUE';
                if (field.auto_increment) columnDefinition += ' AUTO_INCREMENT';
                if (field.foreignKey) foreignKey.push(`FOREIGN KEY (${fieldName}) REFERENCES ${field.foreignKey}`);
                if (typeof field.customize === 'string' && field.customize.length != 0) columnDefinition += ` ${field.customize}`;
                return columnDefinition;
            }

            if (!sqlTypeMap[fieldType]) throw new Error(`Field ${fieldName} has unsupported type ${field}`);

            return `${fieldName} ${sqlTypeMap[fieldType] == "VARCHAR" ? `${sqlTypeMap[fieldType]}(${lengthDefault})` : sqlTypeMap[fieldType]}`;
        });
        if (ifReservedKeywords(this.name)) {
            error("Error: Invalid table name. Please choose a different name that is not a reserved keyword in SQL_request");
            return;
        }
        return `CREATE TABLE IF NOT EXISTS ${this.name} (${columns.join(', ')}${foreignKey.length > 0 ? ", " + foreignKey.join(', ') : ""}) ENGINE=InnoDB`;
    }

    /**
     * Saves data to the database table.
     * @param {Object} data The data to insert into the table.
     * @returns {Promise<Object>} A promise that resolves with the result of the insertion.
     * @throws {Error} Throws an error if the insert fails.
     */
    async save(data) {
        const keys = Object.keys(data);
        const sql_request = `INSERT INTO ${this.name} (${keys.join(', ')}) VALUES (${generateValueSQL(Object.values(data))})`;
        sql(this.name, sql_request);
        try {
            const result = await connexion.promise().query(sql_request);
            return result;
        } catch (err) {
            error(`Error inserting data into ${this.name}: ${err}`);
            throw err;
        }
    }

    /**
     * Finds a unique entry in the database table based on the filter provided.
     * @param {Object} filter An object containing the key-value pairs to use to generate the search condition.
     * @param {string[]} [fields=["*"]] An array of field names to return in the result.
     * @returns {Promise<ModelInstance|number>} A promise that resolves to a ModelInstance if an entry is found, otherwise 0.
     */
    async findOne(filter, fields = ["*"]) {
        const sql_request = `SELECT ${fields.join(", ")} FROM ${this.name} WHERE ${generateCondition(formatObject(filter))}`;

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, Object.values(rows[0])[0]));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return 0;
            });
        });
    }

    /**
     * Finds a record in the database based on the provided filter.
     *
     * @async
     * @param {Object} filter - The filter criteria for the query. Should be an object where keys are column names and values are the values to filter by.
     * @param {Array<string>} [fields=["*"]] - The fields to select in the query. Defaults to selecting all fields.
     * @returns {Promise<ModelInstance|number>} - A promise that resolves to a `ModelInstance` if a record is found, or `0` if no records match the filter.
     *
     * @example
     * // Example usage:
     * const filter = { id: 1 };
     * const fields = ["id", "name"];
     * MyTable.find(filter, fields).then((result) => {
     *     if (result === 0) {
     *         console.log("No records found.");
     *     } else {
     *         console.log("Record found:", result);
     *     }
     * }).catch((err) => {
     *     console.error("Error:", err);
     * });
     */
    async find(filter, fields = ["*"]) {
        const sql_request = `SELECT ${fields.join(", ")} FROM ${this.name} WHERE ${generateCondition(formatObject(filter))}`;
        
        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, Object.values(rows[0])));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        });
    }

    /**
     * 
     * @param {Object} filter The filter criteria for the query. Should be an object where keys are column names and values are the values to filter by.
     * @returns {Promise<ModelInstance|number>} - A promise that resolves to a `ModelInstance` if a record is found, or `0` if no records match the filter.
     */
    async count(filter) {
        return this.customRequest(`SELECT COUNT(*) as count FROM ${this.name} ${filter != undefined ? `WHERE ${generateCondition(formatObject(filter))}` : ""}`);
    }

    /**
     * Runs a custom SQL_request query.
     * @param {string} custom The custom SQL_request query to execute.
     * @returns {Promise<void>} A promise that resolves when the query is executed.
     * @throws {Error} Throws an error if query execution fails.
     */
    async customRequest(custom) {
        console.log(custom);
        return new Promise(async (resolve, reject) => {
            await connexion.promise().query(custom).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, Object.values(rows[0])));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        })
    }

    /**
     * Supprime une entrée de la table SQL correspondant au filtre fourni.
     *
     * @async
     * @function delete
     * @param {Object} filter - Un objet représentant les conditions de filtre pour la suppression.
     * @returns {Promise<number>} Une promesse qui se résout à 0 si aucune ligne n'a été supprimée,
     * ou à une instance de ModelInstance représentant la ligne supprimée.
     * @throws {Error} Lance une erreur si la requête SQL échoue.
     */
    async delete(filter) {
        const sql_request = `DELETE FROM ${this.name} WHERE ${generateCondition(formatObject(filter))}`;

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                if (rows[1] != undefined) return resolve(0);

                return resolve(1);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return 0;
            });
        });
    }

    /**
     * Asynchronously drops a table if it exists in the database.
     *
     * This function constructs a SQL_request query to drop a table with the name specified
     * by the `this.name` property. It then executes the query using a promise-based
     * approach. If the query is successful, the result is logged to the console.
     * If an error occurs during the execution of the query, an error message is logged.
     *
     * @returns {Promise<void>} A promise that resolves when the query execution is complete.
     */
    async dropTable() {
        const sql_request = `DROP TABLE IF EXISTS ${this.name};`;

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                console.log(rows);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        })
    }

    /**
     * Generates a unique UUID for the current model.
     *
     * This function generates a UUID using the SQL_request `UUID()` function and checks if the generated UUID
     * already exists in the database for the current model. If the UUID is unique, it is returned.
     * Otherwise, the function resolves to `null`.
     *
     * @returns {Promise<string|null>} A promise that resolves to a unique UUID string if successful, or `null` if an error occurs or the UUID is not unique.
     *
     * @example
     * const uuid = await model.generate_uuid();
     * if (uuid) {
     *     console.log(`Generated UUID: ${uuid}`);
     * } else {
     *     console.log('Failed to generate a unique UUID.');
     * }
     *
     * @throws {Error} If there is an error executing the SQL_request query.
     */
    async generate_uuid(var_uuid="uuid") {
        const uuid = (await connexion.promise().query("SELECT UUID();"))[0][0]["UUID()"];
        const sql_request = `SELECT COUNT(*) FROM ${this.name} WHERE ${var_uuid}="${uuid}";`;

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                if (rows[0][0]['COUNT(*)'] == 0) return resolve(uuid);
                resolve(null);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return null;
            })
        })
    }
}

/**
 * Represents an instance of a database model.
 * @class
 */
class ModelInstance {
    /**
     * Creates an instance of ModelInstance.
     * @param {string} name The name of the database table.
     * @param {Object} data The instance data.
     */
    constructor(name, data) {
        /**
         * The name of the database table.
         * @type {string}
         */
        this.name = name;

        /**
         * The instance data.
         * @type {Object}
         */
        this.data = data;
    }

    /**
     * Updates a single entry in the database table.
     * 
     * @param {Object} model An object containing the key-value pairs to use for updating.
     * @returns {int} A promise that resolves with updated data.
     * @throws {Error} Throws an error if the update fails.
     */
    async updateOne(model) {
        const sql_request = `UPDATE ${this.name} SET ${generateCondition(formatObject(model), true)} WHERE ${generateCondition(formatObject(this.data[0] != undefined ? this.data[0] : this.data))}`;

        await connexion.promise().query(sql_request).catch((err) => {
            error(`Error executing query: ${err}`);
            throw err;
        });
        return 1;
    }

    /**
     * Deletes a single entry in the database table.
     * @param {Object} model An object containing the key-value pairs to use for deletion.
     * @returns {Promise<Object>} A promise that resolves with the data deleted.
     * @throws {Error} Throws an error if the deletion fails.
     */
    async delete(filter) {
        const sql_request = `DELETE FROM ${this.name} WHERE ${generateCondition(formatObject(filter))}`;

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then((rows) => {
                
                if (rows[1] != undefined) return resolve(0);

                resolve(1);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return 0;
            });
        });
    }

    /**
     * Runs a custom SQL_request query.
     * @param {string} custom The custom SQL_request query to execute.
     * @returns {Promise<void>} A promise that resolves when the query is executed.
     * @throws {Error} Throws an error if query execution fails.
     */
    async customRequest(custom) {
        return new Promise(async (resolve, reject) => {
            await connexion.promise().query(custom).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, Object.values(rows[0])));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        });
    }
}

module.exports = { Schema, connect, logout, Model, client, sqlType };
