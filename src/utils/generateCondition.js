const { getSafe } = require("./security/safe");
const { escapeIdentifier, escapeValue } = require("./sql");

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
module.exports = function (filter, isUpdate = false, schema = null) {
    const keys = Object.keys(filter);
    const values = Object.values(filter);

    const filteredKeys = isUpdate ? keys.filter(key => getSafe(filter, key) !== undefined) : keys;
    const filteredValues = isUpdate ? filteredKeys.map(key => getSafe(filter, key)) : values;

    if (!isUpdate && schema && schema.schemaDict) {
        const uniqueKeys = filteredKeys.filter(key => {
            const field = getSafe(schema.schemaDict, key);
            return field && field.unique === true;
        });
        if (uniqueKeys.length > 0) {
            return uniqueKeys.map(key => {
                let value = getSafe(filter, key);
                const escapedKey = escapeIdentifier(key);
                // normalize strings that may contain surrounding quotes or escaped quotes
                if (typeof value === 'string') {
                    value = value.trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
                }
                if (Array.isArray(value)) {
                    return `${escapedKey} IN (${value.map(v => escapeValue(v)).join(", ")})`;
                }
                if (typeof value === "object" && value !== null || (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}"))) {
                    const jsonVal = typeof value === "string" ? value : JSON.stringify(value);
                    return `JSON_CONTAINS(${escapedKey}, ${escapeValue(jsonVal)})`;
                }
                if (value === null || value === "null") return `${escapedKey} IS NULL`;
                // if string looks like an ISO datetime, convert to MySQL DATETIME format
                if (typeof value === 'string' && /T/.test(value)) {
                    let val = value.replace(/\.\d+Z$/,'').replace(/Z$/,'').replace('T',' ');
                    return `${escapedKey} = ${escapeValue(val)}`;
                }
                return `${escapedKey} = ${escapeValue(value)}`;
            }).join(" AND ");
        }
    }

    // Comportement par défaut
    const conditions = filteredKeys.map((key, index) => {
        let value = getSafe(filteredValues, index);
        const escapedKey = escapeIdentifier(key);

        if (typeof value === 'string') {
            value = value.trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
        }

        if (Array.isArray(value)) {
            return `${escapedKey} IN (${value.map(v => escapeValue(v)).join(", ")})`;
        }
        if (typeof value === "object" && value !== null || (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}"))) {
            const jsonVal = typeof value === "string" ? value : JSON.stringify(value);
            if (isUpdate) {
                return `${escapedKey} = ${escapeValue(jsonVal)}`;
            }
            return `JSON_CONTAINS(${escapedKey}, ${escapeValue(jsonVal)})`;
        }

        if ((value === null || value === "null") && isUpdate == false) return `${escapedKey} IS NULL`;

        // handle date-like strings when schema tells us the field is temporal
        const fieldDef = schema && schema.schemaDict ? getSafe(schema.schemaDict, key) : null;
        let fieldType = null;
        if (fieldDef) {
            if (fieldDef.type && fieldDef.type.name !== undefined) fieldType = fieldDef.type.name;
            else if (fieldDef.type !== undefined) fieldType = fieldDef.type;
            else if (fieldDef && fieldDef.name !== undefined) fieldType = fieldDef.name;
        }
        const normalizedFieldType = String(fieldType ?? "").toLowerCase();
        const isDateLike = ["date", "datetime", "timestamp", "now"].includes(normalizedFieldType);

        if (typeof value === "string") {
            let val = value;
            // strip surrounding quotes if any (double safety)
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
            // if ISO timestamp with Z, convert to MySQL DATETIME format
            if (isDateLike && /T/.test(val)) {
                val = val.replace(/\.\d+Z$/,'').replace(/Z$/,'').replace('T',' ');
            }
            return `${escapedKey} = ${escapeValue(val)}`;
        }
        return `${escapedKey} = ${escapeValue(value)}`;
    }).join(` ${isUpdate == false ? "AND" : ","} `);
    return conditions;
}