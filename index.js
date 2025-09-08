const { Model } = require("./src/models/Model");
const { ModelInstance } = require("./src/models/ModelInstance");
const { connect, logout } = require("./src/db/connect");
const {Schema} = require("./src/models/Schema");
const { sqlType } = require("./src/utils/sqlType");
const { sqlTypeMap } = require("./src/utils/sqlTypeMap");

let client = {};

module.exports = { client, connect, logout, Schema, Model, ModelInstance, sqlType, sqlTypeMap }
