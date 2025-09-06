const sqlTypeMap = {
    String: 'VARCHAR',
    Number: 'INT',
    Boolean: 'BOOLEAN',
    Date: 'DATETIME',
    Object: 'JSON',
    Array: 'VARCHAR',
    Now: 'NOW()',
    Float: 'FLOAT',
    Text: 'TEXT',
    DateTime: "DATETIME",
    Timestamp: "TIMESTAMP",
};

module.exports = {sqlTypeMap}