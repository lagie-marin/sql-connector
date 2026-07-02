const { getSafe, setSafe } = require("./security/safe");

module.exports = function (obj) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = getSafe(obj, key);
            if (value instanceof Date) {
                // convert Date to MySQL DATETIME (no timezone)
                setSafe(obj, key, value.toISOString().slice(0, 19).replace('T', ' '));
                continue;
            }

            if (typeof value === "string") {
                // remove surrounding quotes if present and unescape
                let v = value.trim();
                // remove wrapping double or single quotes
                if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                }
                // unescape common escaped quotes
                v = v.replace(/\\"/g, '"').replace(/\\'/g, "'");
                setSafe(obj, key, v);
                continue;
            }

            if (typeof value === "object") {
                // stringify objects and escape single quotes for SQL safety
                setSafe(obj, key, JSON.stringify(value).replace(/'/g, "\\'"));
            }
        }
    }
    return obj;
}