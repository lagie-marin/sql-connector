const { error } = require("@mlagie/logger");
const { getConnexion } = require("../db/connexion");
const formatObject = require("../utils/formatObject");
const generateCondition = require("../utils/generateCondition");

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

        /**
         * The schema for the instance.
         * @type {Object|null}
         */
        this.schema = schema;
    }

    /**
     * Updates a single entry in the database table.
     * 
     * @param {Object} model An object containing the key-value pairs to use for updating.
     * @returns {int} A promise that resolves with updated data.
     * @throws {Error} Throws an error if the update fails.
     */
    async updateOne(model) {
        const sql_request = `UPDATE ${this.name} SET ${generateCondition(formatObject(model), true)} WHERE ${generateCondition(formatObject(this.data[0] != undefined ? this.data[0] : this.data), false, this.schema)}`;

        await getConnexion().promise().query(sql_request).catch((err) => {
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
        const sql_request = `DELETE FROM ${this.name} WHERE ${generateCondition(formatObject(this.data[0] != undefined ? this.data[0] : this.data))}`;

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

                resolve(new ModelInstance(this.name, Object.values(rows[0]), this.schema));
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return;
            });
        });
    }
}

module.exports = {ModelInstance}