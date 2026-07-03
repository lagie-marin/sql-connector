const { escape, escapeId } = require("mysql2");

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

function normalizeIdentifierPart(part) {
    return String(part).trim().replace(/^`+|`+$/g, "");
}

function escapeIdentifier(identifier) {
    if (identifier === "*") return "*";

    if (typeof identifier !== "string" || identifier.length === 0) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
    }

    return identifier.split(".").map(part => {
        const normalizedPart = normalizeIdentifierPart(part);
        
        if (normalizedPart === "*") return "*";
        if (!SAFE_IDENTIFIER.test(normalizedPart)) {
            throw new Error(`Invalid SQL identifier: ${identifier}`);
        }
        return escapeId(normalizedPart);
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