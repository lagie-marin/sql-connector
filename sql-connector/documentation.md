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
* ### Exemple
```javascript
const userModel = new Model('users', transferSchema);

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
