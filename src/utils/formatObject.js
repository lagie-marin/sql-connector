module.exports = function (obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (value instanceof Date) {
                // convert Date to MySQL DATETIME (no timezone)
                obj[key] = value.toISOString().slice(0, 19).replace('T', ' ');
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
                obj[key] = v;
                continue;
            }

            if (typeof value === "object") {
                // stringify objects and escape single quotes for SQL safety
                obj[key] = JSON.stringify(value).replace(/'/g, "\\'");
            }
        }
    }
    return obj;
}