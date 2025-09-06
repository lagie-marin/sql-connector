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

module.exports = { ifReservedKeywords }