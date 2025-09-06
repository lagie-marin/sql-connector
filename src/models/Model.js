const { logs, error, sql } = require("@mlagie/logger");

function getFieldType(field) {
    if (typeof field === "object") {
        if (field.type && field.type.name !== undefined) return field.type.name;
        else if (field.type !== undefined) return field.type;
        return undefined;
    } else {
        if (field && field.name !== undefined) return field.name;
        else return field;
    }
}

function generateValueSQL(value) {
    return value.map(item => {
        if (item === null) return 'NULL';
        if (typeof item === "string") return `"${item.replace(/"/g, '\\"')}"`;
        if (typeof item === "object" && item !== null) return `"${item}"`;
        return item;
    }).join(", ");
}

/**
 * Represents a database model.
 * @class
 */
class Model {
    static sqlTypeMap = sqlTypeMap;
    static pendingModels = [];

    /**
     * Creates an instance of Model.
     * @param {string} name The name of the database table.
     * @param {Object} schema The schema of the database table.
     */
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
        // Ajoute le modèle à la liste d'attente pour la création différée
        Model.pendingModels.push(this);
    }

    /**
     * Crée toutes les tables dans l'ordre correct en fonction des foreign keys.
     * @returns {Promise<void>}
     */
    static async createAllTables() {
        // Dépendances : {table: [tables dont elle dépend]}
        const dependencies = {};
        const modelMap = {};
        for (const model of Model.pendingModels) {
            modelMap[model.name] = model;
            dependencies[model.name] = [];
            for (const [fieldName, field] of Object.entries(model.schema.schemaDict)) {
                if (field && field.foreignKey) {
                    // field.foreignKey peut être "autreTable(colonne)"
                    const refTable = field.foreignKey.split('(')[0].trim();
                    dependencies[model.name].push(refTable);
                }
            }
        }

        // Tri topologique
        const sorted = [];
        const visited = {};
        function visit(table) {
            if (visited[table] === true) return;
            if (visited[table] === 'temp') throw new Error('Cyclic foreign key dependency detected');
            visited[table] = 'temp';
            for (const dep of dependencies[table]) {
                if (modelMap[dep]) visit(dep);
            }
            visited[table] = true;
            sorted.push(table);
        }
        for (const table of Object.keys(dependencies)) {
            if (!visited[table]) visit(table);
        }

        // Création des tables dans l'ordre
        for (const table of sorted) {
            const model = modelMap[table];
            await new Promise((resolve, reject) => {
                connexion.query(model.generateCreateTableStatement(model.schema.schemaDict), (err) => {
                    if (err) {
                        error(`Error creating table: ${err} with table name: ${model.name}`);
                        return reject(err);
                    }
                    logs(`La table ${model.name} a été créé`);
                    resolve();
                });
            });
        }
        // Vide la liste d'attente
        Model.pendingModels = [];
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

            if (!field.type && typeof field == "object" && !(Array.isArray(field.enum) && field.enum.length > 0)) throw new Error(`Field ${fieldName} has no type defined.`);

            const fieldType = getFieldType(field);

            if (field.type && typeof field == "object") {
                // Si c'est un enum, ne pas vérifier sqlTypeMap
                let columnDefinition = "";
                if (Array.isArray(field.enum) && field.enum.length > 0) {
                    const enumValues = field.enum.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
                    columnDefinition = `${fieldName} ENUM(${enumValues})`;
                } else {
                    if (!sqlTypeMap[fieldType]) throw new Error(`Field ${fieldName} has unsupported type ${fieldType}.`);
                    columnDefinition = `${fieldName} ${sqlTypeMap[fieldType]}${sqlTypeMap[fieldType] == "VARCHAR" || sqlTypeMap[fieldType] == "INT" ? `(${field.length > 0 ? field.length : lengthDefault})` : ""}`;
                }

                if (field.required) columnDefinition += ' NOT NULL';
                if (field.default !== undefined && field.default != null) columnDefinition += ` DEFAULT "${field.default}"`;
                if (field.default === null) columnDefinition += ` DEFAULT NULL`;
                if (field.unique) columnDefinition += ' UNIQUE';
                if (field.auto_increment) columnDefinition += ' AUTO_INCREMENT';
                if (field.foreignKey) foreignKey.push(`FOREIGN KEY (${fieldName}) REFERENCES ${field.foreignKey}`);
                if (field.primary_key) columnDefinition += ' PRIMARY KEY';
                if (typeof field.customize === 'string' && field.customize.length != 0) columnDefinition += ` ${field.customize}`;
                return columnDefinition;
            }

            if (Array.isArray(field.enum) && field.enum.length > 0) {
                const enumValues = field.enum.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
                return `${fieldName} ENUM(${enumValues})`;
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
     * Récupère plusieurs entrées de la table.
     * @param {Object} [options] - Options de requête (attributs, where, order, limit).
     * @param {string[]} [options.attributes] - Champs à retourner.
     * @param {Object} [options.where] - Filtres (clé/valeur).
     * @param {Array} [options.order] - Ex: [['points', 'DESC']]
     * @param {number} [options.limit] - Limite de résultats.
     * @returns {Promise<Array<Object>>}
     */
    async findAll(options = {}) {
        const {
            attributes = ['*'],
            where = undefined,
            order = undefined,
            limit = undefined
        } = options;

        let sql_request = `SELECT ${attributes.join(', ')} FROM ${this.name}`;
        if (where) {
            sql_request += ` WHERE ${generateCondition(formatObject(where))}`;
        }
        if (order && Array.isArray(order) && order.length > 0) {
            const orderStr = order.map(([col, dir]) => `${col} ${dir}`).join(', ');
            sql_request += ` ORDER BY ${orderStr}`;
        }
        if (limit) {
            sql_request += ` LIMIT ${limit}`;
        }

        return new Promise((resolve, reject) => {
            connexion.promise().query(sql_request).then(([rows]) => {
                resolve(rows);
            }).catch((err) => {
                error(`Error executing findAll: ${err}`);
                resolve([]);
            });
        });
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

                resolve(new ModelInstance(this.name, Object.values(rows[0])[0], this.schema));
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

                resolve(new ModelInstance(this.name, Object.values(rows[0]), this.schema));
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
        return new Promise(async (resolve, reject) => {
            await connexion.promise().query(custom).then((rows) => {
                if (rows.length == 0) return resolve(0);

                resolve(new ModelInstance(this.name, Object.values(rows[0]), this.schema));
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
    async generate_uuid(var_uuid = "uuid") {
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

module.exports = {Model}