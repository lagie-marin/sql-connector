const { logs, error, sql } = require("@mlagie/logger");
const { sqlTypeMap } = require("../utils/sqlTypeMap");
const { getConnexion } = require("../db/connexion");
const generateCondition = require("../utils/generateCondition");
const formatObject = require("../utils/formatObject");
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { ModelInstance } = require("./ModelInstance");

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

function getColumnDefinition(fieldName, field) {
    if (field.primary_key && field.unique) {
        throw new Error(`Field '${fieldName}' cannot be both PRIMARY KEY and UNIQUE.`);
    }

    const fieldType = getFieldType(field);
    let colDef = "";

    if (Array.isArray(field.enum) && field.enum.length > 0) {
        const enumValues = field.enum.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
        colDef = `ENUM(${enumValues})`;
    } else {
        if (!sqlTypeMap[fieldType]) throw new Error(`Field ${fieldName} has unsupported type ${fieldType}.`);
        colDef = `${sqlTypeMap[fieldType]}${(sqlTypeMap[fieldType] == "VARCHAR" || sqlTypeMap[fieldType] == "INT") ? `(${field.length > 0 ? field.length : 255})` : ""}`;
    }
    if (field.required) colDef += ' NOT NULL';
    if (field.default !== undefined && field.default != null) colDef += ` DEFAULT "${field.default}"`;
    if (field.default === null) colDef += ` DEFAULT NULL`;
    if (field.unique) colDef += ' UNIQUE';
    if (field.auto_increment) colDef += ' AUTO_INCREMENT';
    if (field.primary_key) colDef += ' PRIMARY KEY';
    if (typeof field.customize === 'string' && field.customize.length != 0) colDef += ` ${field.customize}`;
    return `${fieldName} ${colDef}`;
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
     * Synchronise toutes les tables avec leur schéma JS (création + ajout des colonnes manquantes).
     * @returns {Promise<void>}
     */
    static async syncAllTables({ dangerousSync = false } = {}) {
        // Dépendances : {table: [tables dont elle dépend]}
        const dependencies = {};
        const modelMap = {};
        for (const model of Model.pendingModels) {
            modelMap[model.name] = model;
            dependencies[model.name] = [];
            for (const [_, field] of Object.entries(model.schema.schemaDict)) {
                if (field && field.foreignKey) {
                    const refTable = field.foreignKey.split('(')[0].trim();
                    dependencies[model.name].push(refTable);
                }
            }
        }

        // Récupère toutes les tables existantes dans la base
        const conn = getConnexion();
        const [dbTablesRows] = await conn.promise().query("SHOW TABLES");
        const dbTables = dbTablesRows.map(row => Object.values(row)[0]);

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

        // --- Détruit les tables qui n'ont plus de schéma ---
        for (const dbTable of dbTables) {
            if (!modelMap[dbTable]) {
                try {
                    const backupPath = `./backup_${dbTable}_${Date.now()}.sql`;
                    // Sauvegarde rapide en SQL (INSERTs)
                    const [rows] = await conn.promise().query(`SELECT * FROM \`${dbTable}\``);
                    if (rows.length > 0) {
                        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
                        const values = rows.map(row =>
                            '(' + Object.values(row).map(val =>
                                val === null ? 'NULL' : conn.escape(val)
                            ).join(', ') + ')'
                        ).join(',\n');
                        const insertSQL = `INSERT INTO \`${dbTable}\` (${columns}) VALUES${values};\n`;
                        fs.writeFileSync(backupPath, insertSQL, 'utf-8');
                        logs(`Sauvegarde SQL de la table '${dbTable}' effectuée dans '${backupPath}'.`);
                    } else {
                        fs.writeFileSync(backupPath, '', 'utf-8');
                        logs(`Table '${dbTable}' vide, fichier '${backupPath}' créé.`);
                    }
                } catch (err) {
                    error(`Erreur lors de la sauvegarde SQL de la table '${dbTable}': ${err}`);
                }
                logs(`Table '${dbTable}' n'a plus de schéma associé, suppression...`);
                await conn.promise().query(`DROP TABLE IF EXISTS \`${dbTable}\``);
                logs(`Table '${dbTable}' supprimée.`);
            }
        }

        // Création/synchronisation des tables dans l'ordre
        for (const table of sorted) {
            const model = modelMap[table];

            // 1. Crée la table si elle n'existe pas (version avec promesses)
            try {
                await conn.promise().query(model.generateCreateTableStatement(model.schema.schemaDict));
                await logs(`La table ${model.name} a été créée ou existe déjà`);
            } catch (err) {
                error(`Error creating table: ${err} with table name: ${model.name}`);
                throw err;
            }

            // --- Restauration automatique si backup SQL trouvé ---
            const backupPattern = `./backup_${model.name}_*.sql`;
            const backupFiles = glob.sync(backupPattern).filter(f => !f.endsWith('.ignored'));
            if (backupFiles.length > 0) {
                const latestBackup = backupFiles.sort().reverse()[0];
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                // Demande restauration
                const answer = await new Promise((resolve) => {
                    rl.question(
                        `Un backup a été trouvé pour la table '${model.name}' (${latestBackup}). Voulez-vous restaurer les données ? (y/N) `,
                        (answer) => {
                            resolve(answer.trim().toLowerCase());
                        }
                    );
                });

                if (answer === 'y') {
                    try {
                        const sqlContent = fs.readFileSync(latestBackup, 'utf-8');
                        await conn.promise().query(sqlContent);
                        await logs(`Backup restauré pour la table '${model.name}'.`);
                    } catch (err) {
                        error(`Erreur lors de la restauration du backup pour '${model.name}': ${err}`);
                    }
                }

                // Toujours demander la suppression après restauration ou non
                await new Promise((resolve) => {
                    rl.question(
                        `Voulez-vous supprimer le fichier de backup '${latestBackup}' ? (y/N) `,
                        (delAnswer) => {
                            if (delAnswer.trim().toLowerCase() === 'y') {
                                fs.unlinkSync(latestBackup);
                                logs(`Backup supprimé : ${latestBackup}`);
                            } else {
                                // Renomme le fichier pour ne plus proposer la restauration
                                fs.renameSync(latestBackup, latestBackup + '.ignored');
                                logs(`Backup ignoré pour la table '${model.name}'. Il ne sera plus proposé.`);
                            }
                            rl.close();
                            resolve();
                        }
                    );
                });
            }

            // 2. Synchronise les colonnes (renommage, ajout, suppression)
            const [columns] = await conn.promise().query(
                `SHOW COLUMNS FROM \`${model.name}\``
            );
            let existingCols = columns.map(col => col.Field);

            for (const [fieldName, field] of Object.entries(model.schema.schemaDict)) {
                if (existingCols.includes(fieldName)) {
                    // 1. Récupère infos colonne
                    const currentCol = columns.find(col => col.Field === fieldName);
                    const [indexes] = await conn.promise().query(
                        `SHOW INDEX FROM \`${model.name}\` WHERE Column_name = ?`, [fieldName]
                    );

                    // 2. Vérifie les propriétés principales
                    let needModify = false;

                    // Type
                    const expectedType = sqlTypeMap[getFieldType(field)]?.toUpperCase();
                    const dbType = currentCol.Type.toUpperCase().split('(')[0];
                    if (expectedType !== dbType)
                        needModify = true;

                    // Nullability check
                    const shouldBeNotNull = field.required === true || field.primary_key === true;
                    if ((shouldBeNotNull && currentCol.Null === "YES") || (!shouldBeNotNull && currentCol.Null === "NO"))
                        needModify = true;

                    // Default
                    if ((field.default ?? null) != (currentCol.Default ?? null))
                        needModify = true;

                    // Unique
                    const isUniqueInDB = indexes.some(idx => idx.Non_unique === 0 && idx.Key_name !== 'PRIMARY');
                    if (!!field.unique !== isUniqueInDB)
                        needModify = true;

                    // Primary key
                    const isPrimaryInDB = indexes.some(idx => idx.Key_name === 'PRIMARY');
                    if (!!field.primary_key !== isPrimaryInDB)
                        needModify = true;

                    // 3. Si différence, on modifie
                    if (needModify) {
                        const newColDef = getColumnDefinition(fieldName, field);
                        const alterSQL = `ALTER TABLE \`${model.name}\` MODIFY COLUMN ${newColDef}`;
                        await conn.promise().query(alterSQL);
                    }
                }
                // --- Warn si oldName est présent dans le schéma ---
                if (field.oldName) {
                    logs(`⚠️  Pensez à retirer la propriété 'oldName' du champ '${fieldName}' dans le schéma JS de '${model.name}' pour éviter des renommages inutiles à l'avenir.`);
                }
            }

            // --- Étape 1 : Renommage des colonnes ---
            for (const [fieldName, field] of Object.entries(model.schema.schemaDict)) {
                if (field.oldName && existingCols.includes(field.oldName) && !existingCols.includes(fieldName)) {
                    // Génère la définition SQL de la nouvelle colonne
                    let colDef = getColumnDefinition(fieldName, field);

                    // Renomme la colonne
                    const alterSQL = `ALTER TABLE \`${model.name}\` CHANGE COLUMN \`${field.oldName}\` \`${fieldName}\` ${colDef}`;
                    await conn.promise().query(alterSQL);
                    logs(`Colonne ${field.oldName} renommée en ${fieldName} dans ${model.name}`);
                    // Mets à jour existingCols pour la suite
                    existingCols = existingCols.map(col => col === field.oldName ? fieldName : col);
                }
            }

            // --- Étape 2 : Ajout des colonnes manquantes ---
            for (const [fieldName, field] of Object.entries(model.schema.schemaDict)) {
                if (!existingCols.includes(fieldName)) {
                    let colDef = getColumnDefinition(fieldName, field);

                    // Ajoute la colonne
                    const alterSQL = `ALTER TABLE \`${model.name}\` ADD COLUMN \`${fieldName}\` ${colDef}`;
                    await conn.promise().query(alterSQL);
                    logs(`Colonne ${fieldName} ajoutée à ${model.name}`);
                    existingCols.push(fieldName);
                }
            }

            // --- Étape 3 : Suppression des colonnes orphelines (dangerousSync) ---
            if (dangerousSync) {
                for (const col of existingCols) {
                    if (!Object.keys(model.schema.schemaDict).includes(col)) {
                        const alterSQL = `ALTER TABLE \`${model.name}\` DROP COLUMN \`${col}\``;
                        await conn.promise().query(alterSQL);
                        logs(`Colonne ${col} supprimée de ${model.name}`);
                    }
                }
            }
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
                return getColumnDefinition(fieldName, field);
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
            const result = await getConnexion().promise().query(sql_request);
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
            getConnexion().promise().query(sql_request).then(([rows]) => {
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
            getConnexion().promise().query(sql_request).then((rows) => {
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
            getConnexion().promise().query(sql_request).then((rows) => {
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
            await getConnexion().promise().query(custom).then((rows) => {
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
            getConnexion().promise().query(sql_request).then((rows) => {
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
            getConnexion().promise().query(sql_request).then((rows) => {
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
        const uuid = (await getConnexion().promise().query("SELECT UUID();"))[0][0]["UUID()"];
        const sql_request = `SELECT COUNT(*) FROM ${this.name} WHERE ${var_uuid}="${uuid}";`;

        return new Promise((resolve, reject) => {
            getConnexion().promise().query(sql_request).then((rows) => {
                if (rows[0][0]['COUNT(*)'] == 0) return resolve(uuid);
                resolve(null);
            }).catch((err) => {
                error(`Error executing query: ${err}`);
                return null;
            })
        })
    }
}

module.exports = { Model }