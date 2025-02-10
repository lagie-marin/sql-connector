const fs = require('fs');
const dayjs = require("dayjs");
const dotenv = require("dotenv");
const format = "{tstamp} {tag} {txt}\n";
const path = require('path');

async function error(content) {
    await write(content, "black", "bgRed", "ERROR", true);
}

async function serveur(content) {
    await write(content, "black", "bgBlue", "SERVER", false);
}

async function logs(content) {
    await write(content, "black", "bgWhite", "LOG", false);
}

async function client(content) {
    await write(content, "black", "bgGreen", "CLIENT", false);
}

/**
 * Sauvegarde les requêtes SQL
 * @param {*} content requête SQL
 */
function sql(table_name, content) {
    appendToFile(`${content}\n`, `${table_name}.sql`);
}

async function write(content, tagColor, bgTagColor, tag, error = false) {
    const chalk = (await import("chalk")).default;
    const timestamp = `[${dayjs().format("DD/MM - HH:mm:ss")}]`;
    const logTag = `[${tag}]`;
    const stream = error ? process.stderr : process.stdout;

    const item = format
        .replace("tstamp", chalk.gray(timestamp))
        .replace("{tag}", chalk[bgTagColor][tagColor](logTag))
        .replace("{txt}", chalk.white(content));
    appendToFile(item);
    stream.write(item);
}

module.exports = { error, serveur, logs, client, sql };
function appendToFile(content, nameFile = "logs.txt") {
    dotenv.config();
    if (!process.env.DEBUG || process.env.DEBUG !== "true") return
    const filePath = `${process.env.LOGS}/${nameFile}`;
    if (!content) {
        console.error('Le contenu est vide ou non défini.');
        return;
    }

    const strippedContent = content.replace(/\x1B\[[0-9;]*[mK]/g, '');

    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o777 });
    }

    const fileExists = fs.existsSync(filePath);
    if (!fileExists) {
        fs.writeFileSync(filePath, '', { flag: 'wx' });
    }

    const lines = strippedContent.split('\n');
    fs.appendFileSync(filePath, lines.join('\n'));
}