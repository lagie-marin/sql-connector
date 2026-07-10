const { escapeIdentifier, escapeValue } = require("../sql");

module.exports = (field) => {
    if (typeof field === 'string') return `COUNT(${escapeIdentifier(field)})`;
    if (field instanceof Array && field !== null) return field.map(col => `COUNT(${escapeIdentifier(col)})`).join(' + ');
    if (field instanceof Object) {
        const [key, value] = Object.entries(field)[0];
        return `COUNT(CASE WHEN ${escapeIdentifier(key)} = ${escapeValue(value)} THEN 1 END)`;
    }
    throw new Error("Invalid field type for COUNT. Must be a string, array, or object.");
} 