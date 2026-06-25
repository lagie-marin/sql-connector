const formatObject = require("./formatObject");
const generateCondition = require("./generateCondition");

function buildField(field) {
    // 👉 cas simple : string (nom de colonne)
    if (typeof field === 'string') {
        return field;
    }

    let sql = '';

    if (field.sum)
        sql = `SUM(${field.sum})`;
    else if (field.dateFormat) {
        const [col, format] = field.dateFormat;
        sql = `DATE_FORMAT(${col}, '${format}')`;
    }
    else if (field.col)
        sql = field.col;

    if (field.as)
        sql += ` AS ${field.as}`;
    else if (field.sum)
        sql += ` AS ${field.sum}`;
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
            parts.push(`WHERE ${options.where}`);
        } else {
            parts.push(`WHERE ${generateCondition(formatObject(options.where))}`);
        }
    }

    if (options.groupBy) {
        parts.push(`GROUP BY ${options.groupBy.join(', ')}`);
    }

    if (options.having) {
        parts.push(`HAVING ${options.having}`);
    }

    if (options.orderBy) {
        const order = options.orderBy.map(o =>
            typeof o === 'string'
                ? o
                : `${o.field} ${o.direction || 'ASC'}`
        );
        parts.push(`ORDER BY ${order.join(', ')}`);
    }

    if (options.limit) {
        parts.push(`LIMIT ${options.limit}`);
    }

    return parts.join('\n\n');
}

module.exports = { buildQueryParts, buildSelect }