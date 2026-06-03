# Documentation du module sql-connector

[English](../../README.md) | Français

Le module sql-connector permet de gérer des connexions MySQL, de définir des schémas, de synchroniser automatiquement des tables et d'exposer des modèles pour manipuler les données simplement.

## Importation

```javascript
const { Schema, connect, logout, Model, ModelInstance, client, sqlTypeMap } = require('sql-connector');
```

## Connexion à la base

`connect(config)` ouvre une connexion MySQL à partir d'un objet de configuration compatible avec mysql2.

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

`logout()` ferme proprement la connexion.

```javascript
await logout();
```

## Schéma

`Schema` décrit la structure d'une table. Chaque champ peut utiliser les propriétés suivantes.

| Propriété | Type | Description |
|---|---|---|
| type | `SqlType` ou `{ name: SqlType }` | Type SQL du champ |
| length | `number` | Longueur maximale |
| required | `boolean` | Champ obligatoire |
| default | `any` | Valeur par défaut |
| unique | `boolean` | Valeur unique |
| auto_increment | `boolean` | Auto-incrément |
| foreignKey | `string` | Référence de clé étrangère |
| enum | `string[]` | Liste de valeurs autorisées |
| primary_key | `boolean` | Clé primaire |
| customize | `string` | Options SQL additionnelles |

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

## Synchronisation des tables

`Model.syncAllTables()` compare les schémas JS avec la base et applique uniquement les différences utiles.

- Ajout de colonne: automatique.
- Suppression de colonne: uniquement avec `dangerousSync: true`.
- Renommage de colonne: possible avec `oldName`.
- Tables orphelines: sauvegarde avant suppression dans un fichier `backup_*.sql`.

```javascript
await Model.syncAllTables();
await Model.syncAllTables({ dangerousSync: true });
```

Point important: ne combinez pas `primary_key: true` et `unique: true` sur le même champ. Une clé primaire est déjà unique et non nulle.

## Modèles

`Model` représente une table SQL.

Méthodes principales:

- `save(data)` pour insérer une ligne
- `findOne(filter, fields)` pour récupérer une seule entrée
- `find(filter, fields)` pour récupérer plusieurs entrées
- `findAll(options)` pour les recherches avancées
- `count(filter)` pour compter les lignes
- `customRequest(custom)` pour exécuter une requête SQL personnalisée
- `delete(filter)` pour supprimer une entrée
- `dropTable()` pour supprimer la table
- `generate_uuid()` pour générer un UUID unique
- `Model.createAllTables()` pour créer toutes les tables dans le bon ordre

```javascript
const userModel = new Model('users', userSchema);

await Model.createAllTables();
await userModel.save({ email: 'user@example.com', status: 'active' });

const user = await userModel.findOne({ email: 'user@example.com' });
await userModel.delete({ email: 'user@example.com' });
```

## Instances de modèle

`ModelInstance` représente une ligne déjà chargée depuis la base.

- `updateOne(model)` met à jour la ligne
- `delete(model)` supprime la ligne avec un filtre
- `deleteOne()` supprime la ligne de l'instance
- `customRequest(custom)` exécute une requête personnalisée

```javascript
const userInstance = new ModelInstance('users', { email: 'user@example.com' });

await userInstance.updateOne({ status: 'inactive' });
await userInstance.deleteOne();
```

## Types SQL

`sqlTypeMap` expose les types SQL les plus courants.

```javascript
console.log(sqlTypeMap.String); // "VARCHAR"
```

## Client

`client` est un objet partagé pensé pour centraliser des fonctions applicatives réutilisables.

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

## Résumé

sql-connector fournit une couche simple pour connecter une base MySQL, décrire des schémas, synchroniser les tables et manipuler les données avec des modèles typés.