# sql-connector
<img src="https://api.visitorbadge.io/api/VisitorHit?user=lagie-marin&repo=sql-connector-badge&countColor=%237B1E7A" height="20px"/> ![GitHub package.json version](https://img.shields.io/github/package-json/v/lagie-marin/sql-connector?color=#008000) ![NPM Downloads](https://img.shields.io/npm/d18m/%40mlagie%2Fsql-connector?color=#008000) ![NPM Downloads](https://img.shields.io/npm/dw/%40mlagie%2Fsql-connector?color=#008000) ![GitHub followers](https://img.shields.io/github/followers/lagie-marin?style=plastic&color=color%3D%23008000) ![GitHub repo size](https://img.shields.io/github/repo-size/lagie-marin/sql-connector?color=%green)
 ![GitHub last commit](https://img.shields.io/github/last-commit/lagie-marin/sql-connector) ![GitHub forks](https://img.shields.io/github/forks/lagie-marin/sql-connector?style=plastic&color=%green)

# Documentation du module `sql-connector`

Le module `sql-connector` permet de gérer les connexions à une base de données MySQL, de définir des schémas de tables, et d'interagir avec les données de manière simple et efficace.

## Importation du module

```javascript
const { Schema, connect, logout, Model, client, sqlType } = require('sql-connector');
```

### Fonctions

`connect(config)` Établit une connexion à la base de données.

* Paramètres:
    * `config` (Object) : La configuration de la connexion à la base de données.
    * `host` (string) : L'hôte de la base de données.
    * `port` (number) : Le port de la base de données.
    * `user` (string) : Le nom d'utilisateur pour la connexion.
    * `password` (string) : Le mot de passe pour la connexion.
    * `database` (string) : Le nom de la base de données.
    * `ect` pour en savoir plus vous pouvez vous rendre sur https://github.com/mysqljs/mysql dans la section `Connection options`

* ### Exemple:

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

`logout()` Ferme la connexion à la base de données.

* ### Exemple:

```javascript
await logout();
```

### Interface `SchemaField`

Décrit les propriétés d'un champ dans le schéma d'une table SQL. Chaque clé du dictionnaire passé au constructeur de `Schema` doit respecter cette interface.

| Propriété        | Type                                 | Description                                                                 |
|------------------|--------------------------------------|-----------------------------------------------------------------------------|
| type             | `SqlType` ou `{ name: SqlType }`     | Type du champ (String, Number, Boolean, etc.)                               |
| length           | `number`                             | Longueur maximale (pour VARCHAR ou INT)                                     |
| required         | `boolean`                            | Si le champ est obligatoire (NOT NULL)                                      |
| default          | `any`                                | Valeur par défaut                                                           |
| unique           | `boolean`                            | Si le champ doit être unique                                                |
| auto_increment   | `boolean`                            | Si le champ est auto-incrémenté                                             |
| foreignKey       | `string`                             | Clé étrangère (ex: "otherTable(column)")                                   |
| enum             | `string[]`                           | Liste de valeurs pour un champ ENUM                                         |
| primary_key      | `boolean`                            | Si le champ est une clé primaire                                            |
| customize        | `string`                             | Ajout d'options SQL personnalisées                                          |

#### Exemple d'utilisation

```javascript
const userSchema = new Schema({
    status: {
        type: String,
        enum: ["active", "inactive", "pending"], // champ ENUM
        required: true,
        default: "pending"
    },
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
    }
});
```

### Classes `Schema`

Représente un schéma de base de données.
* Constructeur:
        * Schema(schemaDict) : Crée une instance de Schema.
                * schemaDict (Object) : Un dictionnaire définissant le schéma.

* Exemple

```javascript
const transferSchema = new Schema({
    token: {
        type: String,
        length: 50
    },
    mdp: {
        type: String,
        length: 15
    }
});
```

## Synchronisation automatique du schéma et gestion des migrations

> **⚠️ Important : Synchronisation du schéma et sécurité**
>
> Toutes les opérations de synchronisation avancée du schéma (modification de type, contraintes, renommage, suppression de colonnes, etc.) **ne sont effectuées que si vous activez explicitement l’option `{ dangerousSync: true }`** lors de l’appel à `Model.syncAllTables`.
>
> Par défaut (`dangerousSync: false`), aucune modification de structure n’est appliquée sur les tables existantes pour garantir la sécurité de vos données en production.  
> Utilisez `dangerousSync` uniquement dans un environnement de développement ou lors de migrations contrôlées.

### Ajout, suppression et renommage de colonnes

- **Ajout automatique de colonnes**  
  Lorsque vous ajoutez un champ dans le schéma JS, la colonne correspondante est automatiquement ajoutée dans la base de données lors de la synchronisation avec :
  ```js
  await Model.syncAllTables();
  ```

- **Suppression automatique de colonnes**  
  Si vous retirez un champ du schéma JS, la colonne reste dans la base par défaut.  
  Pour supprimer automatiquement les colonnes disparues, utilisez :
  ```js
  await Model.syncAllTables({ dangerousSync: true });
  ```
  ⚠️ Attention, cela supprime les données de ces colonnes.

- **Renommage de colonne sans perte de données**  
  Pour renommer une colonne, ajoutez la propriété `oldName` dans le schéma :
  ```js
  const userSchema = new Schema({
      role: { type: String, oldName: "rang" }
  });
  ```
  Lors de la synchronisation, la colonne SQL sera renommée sans perte de données.  
  Un avertissement s’affichera pour vous rappeler de retirer `oldName` du schéma après migration.

### Suppression et sauvegarde des tables orphelines

- Si une table SQL n’a plus de schéma JS associé, elle est supprimée automatiquement lors de la synchronisation.
- **Avant suppression**, un fichier de backup SQL (INSERTs) est généré dans le dossier courant (ex : `backup_MaTable_1690000000000.sql`).

### Restauration et gestion des backups

- Si une table supprimée réapparaît dans le schéma, le module détecte la présence d’un backup et propose :
  1. **De restaurer les données** (exécution du fichier SQL).
  2. **De supprimer le backup** après restauration ou non.
  3. Si vous refusez la suppression, le backup est renommé en `.ignored` et ne sera plus proposé.

### Synchronisation intelligente des colonnes

Lors de la synchronisation (`Model.syncAllTables()`), le module compare chaque colonne existante avec la définition du schéma JS :

- **Type** : Si le type SQL attendu diffère de celui en base, la colonne est modifiée.
- **Nullabilité** : Si la contrainte `NOT NULL` ou `NULL` diffère, la colonne est modifiée.  
  > ⚠️ Une colonne `primary_key` est toujours considérée comme `NOT NULL` même si `required` n'est pas précisé.
- **Valeur par défaut** : Si la valeur par défaut diffère, la colonne est modifiée.
- **Unique** : Si la contrainte `UNIQUE` diffère, la colonne est modifiée.
- **Primary key** : Si la contrainte `PRIMARY KEY` diffère, la colonne est modifiée.

Seules les différences réelles entraînent une modification SQL, ce qui évite les migrations inutiles.

> **Note :**  
> Il est interdit de déclarer une colonne à la fois `primary_key: true` et `unique: true` dans le schéma JS.  
> **Explication :** En SQL, une clé primaire (`PRIMARY KEY`) est déjà unique par définition et impose la contrainte `UNIQUE` et `NOT NULL` sur la colonne. Ajouter explicitement `unique: true` en plus de `primary_key: true` est redondant et provoque une erreur SQL ("Multiple primary key defined").  
>  
> **En résumé :**  
> - Utilisez seulement `primary_key: true` pour une colonne qui doit être la clé primaire.  
> - Utilisez `unique: true` pour une colonne qui doit être unique mais n'est pas la clé primaire.

---


#### Exemple d’utilisation

```js
// Synchronisation simple (ajout/renommage de colonnes, suppression de tables orphelines avec backup)
await Model.syncAllTables();

// Synchronisation avec suppression automatique des colonnes disparues
await Model.syncAllTables({ dangerousSync: true });
```

---

## Class Model
Représente un modèle de base de données.
* ### Constructeur :
    * `Model(name, schema)` : Crée une instance de `Model`.
    * `name (string)` : Le nom de la table de base de données.
    * `schema (Schema)` : Le schéma de la table de base de données.
* ### Méthodes :
    * `generateCreateTableStatement(schema)` : Génère une requête SQL pour créer une table.
    * `save(data)` : Sauvegarde des données dans la table.
    * `findOne(filter, fields)` : Trouve une entrée unique dans la table.
    * `find(filter, fields)` : Trouve des entrées dans la table.
    * `customRequest(custom)` : Exécute une requête SQL personnalisée.
    * `delete(filter)` : Supprime une entrée de la table.
    * `dropTable()` : Supprime la table si elle existe.
    * `generate_uuid()` : Génère un UUID unique pour le modèle.
    * `createAllTables()` : **Crée toutes les tables dans le bon ordre selon les dépendances de clés étrangères.** (statique)
* ### Exemple
```javascript
const userModel = new Model('users', transferSchema);
// Après avoir instancié tous les modèles :
await Model.createAllTables(); // Crée toutes les tables dans le bon ordre

// Sauvegarder des données
await userModel.save({ token: 'abc123', mdp: 'password' });

// Trouver une entrée
const user = await userModel.findOne({ token: 'abc123' });

// Supprimer une entrée
await userModel.delete({ token: 'abc123' });
```
## Class ModelInstance
Représente une instance d'un modèle de base de données.
* ### Constructeur:
    * `ModelInstance(name, data)` : Crée une instance de `ModelInstance`.
    * `name (string)` : Le nom de la table de base de données.
    * `data (Object)` : Les données de l'instance.
* ### Méthodes :
    * `updateOne(model)` : Met à jour une entrée unique dans la table.
    * `delete(model)` : Supprime une entrée unique dans la table.
    * `customRequest(custom)` : Exécute une requête SQL personnalisée.
* ### Exemple
```javascript
const userInstance = new ModelInstance('users', { token: 'abc123', mdp: 'password' });

// Mettre à jour des données
await userInstance.updateOne({ mdp: 'newpassword' });

// Supprimer des données
await userInstance.delete({ token: 'abc123' });
```
# Types SQL
Le module fournit également une map des types SQL courants via `sqlType`.
## Type
* String
* Number
* Boolean
* Object
* Array
* Now
* Float
* Text
* DateTime
* Timestamp
* ### Exemple
```javascript
console.log(sqlType.String); // "String"
console.log(sqlTypeMap.String); // "VARCHAR"
```
## Conclusion
Le module `sql-connector` fournit une interface simple et efficace pour interagir avec une base de données MySQL, permettant de définir des schémas, de gérer des connexions, et de manipuler des données de manière intuitive.

# Client
Le module client est un objet utilisé pour stocker des fonctions. Il sert de conteneur centralisé pour diverses fonctions qui peuvent être utilisées dans différentes parties de l'application.

### Utilisation
Pour ajouter une fonction à l'objet client, vous pouvez simplement définir une nouvelle propriété sur l'objet et lui assigner une fonction.
* ### Exemple
```javascript
module.exports = client => {
    client.checkServer() {
        if (server.islaunch())
            return 1;
        return 0;
    };
};
```
### Avantages
* `Centralisation` : Toutes les fonctions liées à des opérations spécifiques peuvent être centralisées dans un seul objet, ce qui facilite la gestion et l'organisation du code.
* `Réutilisabilité` : Les fonctions stockées dans l'objet `client` peuvent être facilement réutilisées dans différentes parties de l'application.
* `Modularité` : En utilisant un objet pour stocker des fonctions, il est plus facile de maintenir et de mettre à jour le code, car les fonctions peuvent être ajoutées, modifiées ou supprimées sans affecter d'autres parties de l'application.

## Conclusion
L'objet `client` est un outil puissant pour organiser et centraliser les fonctions dans votre application. En stockant des fonctions dans cet objet, vous pouvez améliorer la modularité, la réutilisabilité et la maintenabilité de votre code.
