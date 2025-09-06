module.exports = function (obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === "string") {
                obj[key] = value.replace(/"/g, '\\"');
            }
            if (typeof value === "object") {
                obj[key] = JSON.stringify(value)
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "\\'");
            }
        }
    }
    return obj;
}