const { error, logs } = require("@mlagie/logger");
const { getConnexion } = require("../db/connexion");
const formatObject = require("../utils/formatObject");
const generateCondition = require("../utils/generateCondition");
const util = require("util");

/**
 * Represents an instance of a database model.
 * @class
 */
class ModelInstance {
    /**
     * Creates an instance of ModelInstance.
     * @param {string} name The name of the database table.
     * @param {Object} data The instance data.
     * @param {Object|null} [schema=null] The schema for the instance, if available.
     */
    constructor(name, data, schema = null) {
        Object.defineProperties(this, {
            name: {
                value: name,
                writable: true,
                configurable: true,
                enumerable: false
            },
            data: {
                value: data,
                writable: true,
                configurable: true,
                enumerable: true
            },
            schema: {
                value: schema,
                writable: true,
                configurable: true,
                enumerable: false
            }
        });
    }

    getRecordData() {
        return Array.isArray(this.data) ? this.data[0] ?? this.data : this.data;
    }

    toJSON() {
        return this.getRecordData();
    }

    [util.inspect.custom]() {
        return this.getRecordData();
    }

    /**
     * Updates a single entry in the database table.
     * 
     * @param {Object} model An object containing the key-value pairs to use for updating.
     * @returns {int} A promise that resolves with updated data.
     * @throws {Error} Throws an error if the update fails.
     */
    async updateOne(model) {
        const setClause = generateCondition(formatObject(model), true);

        // prefer primary key(s) in WHERE to avoid mismatches on nullable/text fields
        let whereClause;
        try {
            const rec = this.getRecordData();
            const schemaDict = this.schema && this.schema.schemaDict ? this.schema.schemaDict : null;
            if (schemaDict) {
                const pkKeys = Object.entries(schemaDict).filter(([k, v]) => v && v.primary_key === true).map(([k]) => k);
                if (pkKeys.length > 0) {
                    const pkObj = {};
                    for (const k of pkKeys) {
                        if (rec && Object.prototype.hasOwnProperty.call(rec, k)) pkObj[k] = rec[k];
                    }
                    if (Object.keys(pkObj).length > 0) whereClause = generateCondition(formatObject(pkObj), false, this.schema);
                }
            }
            if (!whereClause) whereClause = generateCondition(formatObject(rec), false, this.schema);
        } catch (e) {
            whereClause = generateCondition(formatObject(this.getRecordData()), false, this.schema);
        }
        const sql_request = `UPDATE ${this.name} SET ${setClause} WHERE ${whereClause}`;

        // log SQL for debugging why update may not match
        try { logs(`ModelInstance.updateOne SQL -> ${sql_request}`); } catch (e) {}

        const [result] = await getConnexion().promise().query(sql_request).catch((err) => {
            error(`Error executing query: ${err}`);
            throw err;
        });

        const affected = result && (result.affectedRows !== undefined ? result.affectedRows : 0);

        // Update in-memory data if DB was modified
        if (affected > 0) {
            const record = this.getRecordData();
            if (Array.isArray(this.data)) {
                if (this.data[0] && typeof this.data[0] === 'object') Object.assign(this.data[0], model);
            } else if (record && typeof record === 'object') {
                Object.assign(this.data, model);
            }
        }

        return affected;
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
            getConnexion().promise().query(sql_request).then((rows) => {

                if (rows[1] != undefined) return resolve(0);

                resolve(1);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return 0;
            });
        });
    }

    /**
     * Deletes a single entry in the database table based on the instance data.
     * @returns {Promise<number>} A promise that resolves to the number of rows deleted.
     * @throws {Error} Throws an error if the deletion fails.
     */
    async deleteOne() {
        const sql_request = `DELETE FROM ${this.name} WHERE ${generateCondition(formatObject(this.getRecordData()))}`;

        return new Promise((resolve, reject) => {
            getConnexion().promise().query(sql_request).then((rows) => {
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
            await getConnexion().promise().query(custom).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, rows[0], this.schema));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        });
    }
}

module.exports = {ModelInstance}