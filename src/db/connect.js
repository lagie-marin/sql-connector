const mysql = require("mysql2");

const { getConnexion, setConnexion } = require('./connexion');
const { logs, error } = require("@mlagie/logger");

/**
 * Establishes a connection to the database using a given configuration.
 * @param {Object} config Database connection configuration.
 * @param {string} config.host The database host.
 * @param {number} config.port The database port.
 * @param {string} config.user The username for the connection.
 * @param {string} config.password The password for the connection.
 * @param {string} config.database The name of the database.
 * @returns {Promise<void>} A promise that resolves when the connection is established.
 * 
 * @example
 * const config = {
 *   host: 'localhost',
 *   port: 6666,
 *   user: 'root',
 *   password: 'password',
 *   database: 'mydatabase'
 * };
 * await connect(config);
 */
async function connect(config) {
    setConnexion(mysql.createPool(config));
}

/**
 * Closes the database connection.
 * This function terminates the active database connection and records a logging message
 * indicating whether the shutdown succeeded or failed.
 * 
 * @returns {Promise<void>} A promise that resolves when the connection is closed.
 *
 * @example
 * await logout();
 */
async function logout() {
    getConnexion().end(err => {
        if (err) {
            error(`Error closing database connection: ${err}`);
            return;
        }

        logs("Database connection closed");
    });
}

module.exports = { connect, logout }