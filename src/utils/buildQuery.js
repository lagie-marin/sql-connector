const formatObject = require("./formatObject");
const generateCondition = require("./generateCondition");
const { escapeIdentifier, escapeOrderDirection, escapeValue } = require("./sql");

function buildGroupByItem(group) {
    if (typeof group !== 'string') {
        return escapeIdentifier(group);
    }

    const trimmedGroup = group.trim();

    if (/^DATE_FORMAT\(/i.test(trimmedGroup)) {
        const match = trimmedGroup.match(/^DATE_FORMAT\(([^,]+),\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\)$/i);
        if (match) {
            const column = match[1].trim();
            const format = match[2].slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
            return `DATE_FORMAT(${escapeIdentifier(column)}, ${escapeValue(format)})`;
        }
    }

    return escapeIdentifier(trimmedGroup);
}

function buildField(field) {
    if (typeof field === 'string') {
        if (field === "*") return "*";
        return escapeIdentifier(field);
    }

    let sql = '';

    if (field.sum)
        sql = `SUM(${escapeIdentifier(field.sum)})`;
    else if (field.dateFormat) {
        const [col, format] = field.dateFormat;
        sql = `DATE_FORMAT(${escapeIdentifier(col)}, ${escapeValue(format)})`;
    }
    else if (field.col)
        sql = escapeIdentifier(field.col);

    if (field.as)
        sql += ` AS ${escapeIdentifier(field.as)}`;
    else if (field.sum)
        sql += ` AS ${escapeIdentifier(field.sum)}`;
    return sql;
}

function buildSelect(select = []) {
    if (!select || select.length === 0) {
        return '*';
    }

    return select
        .map(field => buildField(field))
        .join(',\n');
}

function buildQueryParts(options) {
    const parts = [];

    if (options.where) {
        if (typeof options.where === 'string') {
            if (options.where.trim().toUpperCase().startsWith("WHERE ")) throw new Error("Raw string WHERE clauses are not allowed. Use a structured filter instead.");
            else parts.push(`WHERE ${options.where}`);
        } else {
            parts.push(`WHERE ${generateCondition(formatObject(options.where))}`);
        }
    }

    if (options.groupBy) {
        parts.push(`GROUP BY ${options.groupBy.map(group => buildGroupByItem(group)).join(', ')}`);
    }

    if (options.having) {
        throw new Error("Raw string HAVING clauses are not allowed. Use a structured filter instead.");
    }

    if (options.orderBy) {
        const order = options.orderBy.map(o =>
            typeof o === 'string'
                ? escapeIdentifier(o)
                : `${escapeIdentifier(o.field)} ${escapeOrderDirection(o.direction || 'ASC')}`
        );
        parts.push(`ORDER BY ${order.join(', ')}`);
    }

    if (options.limit) {
        if (!Number.isInteger(options.limit) || options.limit < 0) {
            throw new Error("Invalid LIMIT value");
        }
        parts.push(`LIMIT ${options.limit}`);
    }

    return parts.join('\n\n');
}

module.exports = { buildQueryParts, buildSelect }