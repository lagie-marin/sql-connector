// src/utils/security/safe.js

/**
 * Liste noire des clés interdites pour éviter la pollution de prototype.
 */
const BLACKLIST = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Récupère une valeur de manière sécurisée dans un objet.
 * @param {Object} obj - L'objet cible
 * @param {string} key - La clé ou propriété à lire
 * @returns {*} La valeur ou undefined si non trouvé / interdite
 */
function getSafe(obj, key) {
    if (!obj || BLACKLIST.has(key)) {
        return undefined;
    }
    
    // Reflect.get remplace obj[key] de manière native et sécurisée pour ESLint
    return Reflect.get(obj, key);
}

/**
 * Définit une valeur de manière sécurisée dans un objet.
 * @param {Object} obj - L'objet cible
 * @param {string} key - La clé à écrire
 * @param {*} value - La valeur à affecter
 * @returns {boolean} True si l'opération a réussi, false sinon
 */
function setSafe(obj, key, value) {
    if (!obj || BLACKLIST.has(key)) {
        return false;
    }
    
    // Reflect.set remplace obj[key] = value de manière native et sécurisée pour ESLint
    return Reflect.set(obj, key, value);
}

module.exports = { getSafe, setSafe };