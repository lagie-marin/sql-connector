import { PoolOptions } from "mysql2";

export type SqlType =
    | "String"
    | "Number"
    | "Boolean"
    | "Date"
    | "Object"
    | "Array"
    | "Now"
    | "Float"
    | "Text"
    | "DateTime"
    | "Timestamp";

export interface SchemaField {
    type: SqlType | { name: SqlType };
    length?: number;
    required?: boolean;
    default?: any;
    unique?: boolean;
    auto_increment?: boolean;
    foreignKey?: string;
    customize?: string;
}

export interface SchemaDict {
    [key: string]: SchemaField;
}

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
export class Schema {
    constructor(schemaDict: SchemaDict);
    schemaDict: SchemaDict;
}

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
export function connect(config: PoolOptions): Promise<void>;

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
export function logout(): Promise<void>;

/**
 * Represents a database model.
 * @class
 */
export class Model {
    static sqlTypeMap: Record<SqlType, string>;
    static pendingModels: Model[];
    name: string;
    schema: Schema;
    constructor(name: string, schema: Schema);
    /**
     * Crée toutes les tables dans l'ordre correct en fonction des foreign keys.
     * @returns {Promise<void>}
     */
    static createAllTables(): Promise<void>;
    /**
     * Saves data to the database table.
     * @param {Object} data The data to insert into the table.
     * @returns {Promise<Object>} A promise that resolves with the result of the insertion.
     * @throws {Error} Throws an error if the insert fails.
     */
    save(data: Record<string, any>): Promise<any>;
    /**
     * Récupère plusieurs entrées de la table.
     * @param {Object} [options] - Options de requête (attributs, where, order, limit).
     * @param {string[]} [options.attributes] - Champs à retourner.
     * @param {Object} [options.where] - Filtres (clé/valeur).
     * @param {Array} [options.order] - Ex: [['points', 'DESC']]
     * @param {number} [options.limit] - Limite de résultats.
     * @returns {Promise<Array<Object>>}
     */
    findAll(options?: {
        attributes?: string[];
        where?: Record<string, any>;
        order?: [string, string][];
        limit?: number;
    }): Promise<any[]>;
    /**
     * Finds a unique entry in the database table based on the filter provided.
     * @param {Object} filter An object containing the key-value pairs to use to generate the search condition.
     * @param {string[]} [fields=["*"]] An array of field names to return in the result.
     * @returns {Promise<ModelInstance|number>} A promise that resolves to a ModelInstance if an entry is found, otherwise 0.
     */
    findOne(filter: Record<string, any>, fields?: string[]): Promise<ModelInstance | number>;
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
    find(filter: Record<string, any>, fields?: string[]): Promise<ModelInstance | number>;
    /**
     * 
     * @param {Object} filter The filter criteria for the query. Should be an object where keys are column names and values are the values to filter by.
     * @returns {Promise<ModelInstance|number>} - A promise that resolves to a `ModelInstance` if a record is found, or `0` if no records match the filter.
     */
    count(filter?: Record<string, any>): Promise<any>;
    /**
     * Runs a custom SQL_request query.
     * @param {string} custom The custom SQL_request query to execute.
     * @returns {Promise<void>} A promise that resolves when the query is executed.
     * @throws {Error} Throws an error if query execution fails.
     */
    customRequest(custom: string): Promise<any>;
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
    delete(filter: Record<string, any>): Promise<number | ModelInstance>;
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
    dropTable(): Promise<void>;
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
    generate_uuid(var_uuid?: string): Promise<string | null>;
}

/**
 * Represents an instance of a database model.
 * @class
 */
export class ModelInstance {
    name: string;
    data: any;
    schema?: Schema;
    constructor(name: string, data: any, schema?: Schema);
    /**
     * Updates a single entry in the database table.
     * 
     * @param {Object} model An object containing the key-value pairs to use for updating.
     * @returns {int} A promise that resolves with updated data.
     * @throws {Error} Throws an error if the update fails.
     */
    updateOne(model: Record<string, any>): Promise<number>;
    /**
     * Deletes a single entry in the database table.
     * @param {Object} model An object containing the key-value pairs to use for deletion.
     * @returns {Promise<Object>} A promise that resolves with the data deleted.
     * @throws {Error} Throws an error if the deletion fails.
     */
    delete(filter: Record<string, any>): Promise<number | ModelInstance>;
    /**
     * Deletes a single entry in the database table based on the instance data.
     * @returns {Promise<number>} A promise that resolves to the number of rows deleted.
     * @throws {Error} Throws an error if the deletion fails.
     */
    deleteOne(): Promise<number>;
    /**
     * Runs a custom SQL_request query.
     * @param {string} custom The custom SQL_request query to execute.
     * @returns {Promise<void>} A promise that resolves when the query is executed.
     * @throws {Error} Throws an error if query execution fails.
     */
    customRequest(custom: string): Promise<any>;
}

export const client: Record<string, any>;
export const sqlType: Record<string, SqlType>;
