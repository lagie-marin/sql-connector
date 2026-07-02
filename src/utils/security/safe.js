/**
 * Blacklist of prohibited keys to prevent prototype pollution.
 */
const BLACKLIST = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Extracts a value in a secure manner from an object.
 * @param {Object} obj - The target object
 * @param {string} key - The key or property to read
 * @returns {*} The value or undefined if not found / prohibited
 */
function getSafe(obj, key) {
    if (!obj || BLACKLIST.has(key)) {
        return undefined;
    }
    
    return Reflect.get(obj, key);
}

/**
 * Sets a value in a secure manner within an object.
 * @param {Object} obj - The target object
 * @param {string} key - The key or property to write
 * @param {*} value - The value to assign
 * @returns {boolean} True if the operation was successful, false otherwise
 */
function setSafe(obj, key, value) {
    if (!obj || BLACKLIST.has(key)) {
        return false;
    }
    
    return Reflect.set(obj, key, value);
}

module.exports = { getSafe, setSafe };