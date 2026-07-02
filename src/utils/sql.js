const { escape, escapeId } = require("mysql2");

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

function escapeIdentifier(identifier) {
    if (identifier === "*") return "*";

    if (typeof identifier !== "string" || identifier.length === 0) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
    }

    return identifier.split(".").map(part => {
        if (part === "*") return "*";
        if (!SAFE_IDENTIFIER.test(part)) {
            throw new Error(`Invalid SQL identifier: ${identifier}`);
        }
        return escapeId(part);
    }).join(".");
}

function escapeIdentifierList(identifiers) {
    return identifiers.map(identifier => escapeIdentifier(identifier)).join(", ");
}

function escapeValue(value) {
    return escape(value);
}

function escapeOrderDirection(direction) {
    const normalized = String(direction ?? "ASC").toUpperCase();

    if (normalized !== "ASC" && normalized !== "DESC") {
        throw new Error(`Invalid SQL sort direction: ${direction}`);
    }

    return normalized;
}

module.exports = {
    escapeIdentifier,
    escapeIdentifierList,
    escapeOrderDirection,
    escapeValue
};