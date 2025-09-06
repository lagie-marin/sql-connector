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

    if (!isUpdate && schema && schema.schemaDict) {
        const uniqueKeys = keys.filter(key => {
            const field = schema.schemaDict[key];
            return field && field.unique === true;
        });

        if (uniqueKeys.length > 0) {
            return uniqueKeys.map(key => {
                const value = filter[key];
                if (Array.isArray(value)) {
                    return `${key} IN (${value.map(v => `"${v}"`).join(", ")})`;
                }
                if (typeof value === "object" || (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}"))) {
                    const jsonVal = typeof value === "string" ? value : JSON.stringify(value);
                    return `JSON_CONTAINS(${key}, '${jsonVal}')`;
                }
                if (value === null || value === "null") return `${key} IS NULL`;
                return `${key} = ${typeof value === "string" ? `"${value}"` : value}`;
            }).join(" AND ");
        }
    }

    // Comportement par défaut
    const conditions = keys.map((key, index) => {
        const value = values[index];

        if (Array.isArray(value)) {
            return `${key} IN (${value.map(v => `"${v}"`).join(", ")})`;
        }
        if (typeof value === "object" || (typeof value === "string" && value.trim().startsWith("{") && value.trim().endsWith("}"))) {
            const jsonVal = typeof value === "string" ? value : JSON.stringify(value);
            if (isUpdate) {
                return `${key} = '${jsonVal}'`;
            }
            return `JSON_CONTAINS(${key}, '${jsonVal}')`;
        }

        if ((value === null || value === "null") && isUpdate == false) return `${key} IS NULL`;
        return `${key} = ${typeof value === "string" ? `"${value}"` : value}`;
    }).join(` ${isUpdate == false ? "AND" : ","} `);

    return conditions;
}