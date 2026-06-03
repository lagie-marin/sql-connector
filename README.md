# sql-connector documentation

[Français](./docs/fr/README.md) | English

sql-connector helps manage MySQL connections, define table schemas, sync tables automatically, and work with database models through a small API.

## Import

```javascript
const { Schema, connect, logout, Model, ModelInstance, client, sqlTypeMap } = require('sql-connector');
```

## Database connection

`connect(config)` opens a MySQL connection using a configuration object compatible with mysql2.

```javascript
const config = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'mydatabase'
};

await connect(config);
```

`logout()` closes the active connection.

```javascript
await logout();
```

## Schema

`Schema` describes the structure of a table. Each field can use the following properties.

| Property | Type | Description |
|---|---|---|
| type | `SqlType` or `{ name: SqlType }` | SQL type for the field |
| length | `number` | Maximum length |
| required | `boolean` | Not null constraint |
| default | `any` | Default value |
| unique | `boolean` | Unique constraint |
| auto_increment | `boolean` | Auto increment |
| foreignKey | `string` | Foreign key reference |
| enum | `string[]` | Allowed values |
| primary_key | `boolean` | Primary key flag |
| customize | `string` | Extra SQL options |

```javascript
const userSchema = new Schema({
  id: {
    type: Number,
    auto_increment: true,
    primary_key: true
  },
  email: {
    type: String,
    length: 255,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  }
});
```

## Table synchronization

`Model.syncAllTables()` compares JS schemas with the database and applies only meaningful differences.

- New columns are added automatically.
- Removed columns are only dropped with `dangerousSync: true`.
- Column renames are supported through `oldName`.
- Orphan tables are backed up to a `backup_*.sql` file before deletion.

```javascript
await Model.syncAllTables();
await Model.syncAllTables({ dangerousSync: true });
```

Important: do not set both `primary_key: true` and `unique: true` on the same field. A primary key is already unique and not null.

## Models

`Model` represents a SQL table.

Main methods:

- `save(data)` inserts a row
- `findOne(filter, fields)` fetches a single row
- `find(filter, fields)` fetches multiple rows
- `findAll(options)` supports advanced queries
- `count(filter)` counts rows
- `customRequest(custom)` runs a custom SQL query
- `delete(filter)` deletes a row
- `dropTable()` drops the table
- `generate_uuid()` generates a unique UUID
- `Model.createAllTables()` creates tables in dependency order

```javascript
const userModel = new Model('users', userSchema);

await Model.createAllTables();
await userModel.save({ email: 'user@example.com', status: 'active' });

const user = await userModel.findOne({ email: 'user@example.com' });
await userModel.delete({ email: 'user@example.com' });
```

## Model instances

`ModelInstance` represents a row already loaded from the database.

- `updateOne(model)` updates the row
- `delete(model)` deletes the row using a filter
- `deleteOne()` deletes the instance row
- `customRequest(custom)` runs a custom query

```javascript
const userInstance = new ModelInstance('users', { email: 'user@example.com' });

await userInstance.updateOne({ status: 'inactive' });
await userInstance.deleteOne();
```

## SQL types

`sqlTypeMap` exposes the common SQL types.

```javascript
console.log(sqlTypeMap.String); // "VARCHAR"
```

## Client

`client` is a shared object meant to host reusable application functions.

```javascript
module.exports = client => {
  client.checkServer = () => {
    if (server.isLaunch()) {
      return 1;
    }

    return 0;
  };
};
```

## Summary

sql-connector provides a small layer to connect to MySQL, describe schemas, synchronize tables, and manipulate data with typed models.