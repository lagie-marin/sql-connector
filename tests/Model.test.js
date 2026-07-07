// 1. LES MOCKS EN PREMIER
const { mockExecute, mockPool } = require('./mysqlMock');
jest.mock('@mlagie/logger', () => ({
    logs: jest.fn(),
    error: jest.fn()
}));

// 2. LES IMPORTS DE L'APPLICATION
const { Model } = require('../src/models/Model');
const { Schema } = require('../src/models/Schema');
const { setConnexion } = require('../src/db/connexion');
const { sqlTypeMap } = require('../src/utils/sqlTypeMap');
const util = require("util");

describe('Tests unitaires avec Mock - Model.js (generate_uuid)', () => {
    let testModel;

    beforeAll(() => {
        setConnexion(mockPool);
        const userSchema = new Schema({
            id: { type: Number },
            uuid: { type: String }
        });
        testModel = new Model('users', userSchema);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('generate_uuid() devrait renvoyer un UUID si unique', async () => {
        mockExecute
            .mockResolvedValueOnce([
                [
                    { "UUID()": "123e4567-e89b-12d3-a456-426614174000" }
                ]
            ])
            .mockResolvedValueOnce([
                [
                    { "COUNT(*)": 0 }
                ]
            ]);

        const uuid = await testModel.generate_uuid('uuid');
        expect(uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    test('generate_uuid() devrait gérer les rejets/erreurs de la base de données', async () => {
        // On simule le crash de la base de données
        mockExecute.mockRejectedValueOnce(new Error('Syntax Error ou Connexion perdue'));

        const uuid = await testModel.generate_uuid('uuid');

        // L'erreur est catchée par votre Model.js, qui log l'erreur et retourne null.
        expect(uuid).toBeNull();
    });

    test("Le constructeur doit empiler le modèle dans pendingModels", () => {
        const initialLength = Model.pendingModels.length;
        const testModel = new Model("DummyTable", { schemaDict: {} });

        expect(Model.pendingModels.length).toBe(initialLength + 1);
        expect(Model.pendingModels[Model.pendingModels.length - 1]).toBe(testModel);
    });

    test("save() doit générer un INSERT INTO correct", async () => {
        const pipelineModel = new Model("ProjectPipeline", { schemaDict: {} });
        mockExecute.mockResolvedValue([{ insertId: 12, affectedRows: 1 }]);

        const payload = { project_id: 3, name: "start_olm", source: "jenkins" };
        const result = await pipelineModel.save(payload);

        expect(result.insertId).toBe(12);
        expect(mockExecute).toHaveBeenCalled();

        const sqlGenere = mockExecute.mock.calls[0][0];
        const valeursGenerees = mockExecute.mock.calls[0][1];

        expect(sqlGenere).toContain("INSERT INTO `ProjectPipeline`");
        expect(valeursGenerees).toEqual([3, "start_olm", "jenkins"]);
    });

    test("find() doit retourner une liste d'instances hydratées", async () => {
        const pipelineModel = new Model("ProjectPipeline", { schemaDict: {} });

        // On mock la réponse sous forme de lignes (rows) renvoyées par mysql2
        mockExecute.mockResolvedValue([
            [
                { id: 1, name: "start_olm", source: "jenkins" },
                { id: 2, name: "build-job", source: "jenkins" }
            ]
        ]);

        const results = await pipelineModel.find({ where: { source: "jenkins" } });

        expect(results).toHaveLength(2);
        // On vérifie que la ligne a bien été hydratée en tant que ModelInstance
        expect(results[0]._name).toBe("ProjectPipeline");
        expect(results[0].name).toBe("start_olm");
    });

    test("count() doit renvoyer le nombre d'enregistrements", async () => {
        const pipelineModel = new Model("ProjectPipeline", { schemaDict: {} });

        // Simule le résultat d'un SELECT COUNT(*)
        mockExecute.mockResolvedValue([[{ count: 5 }]]);

        const total = await pipelineModel.count({ source: "jenkins" });
        expect(total).not.toBeNull();
    });

    test("save() doit propager une erreur SQL", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockRejectedValue(new Error("INSERT ERROR"));

        await expect(
            model.save({ name: "john" })
        ).rejects.toThrow("INSERT ERROR");
    });

    test("find() retourne un tableau vide", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([[]]);

        const result = await model.find();

        expect(result).toEqual([]);
    });

    test("find() propage une erreur SQL", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockRejectedValue(new Error("SELECT ERROR"));

        await expect(
            model.find()
        ).rejects.toThrow("SELECT ERROR");
    });

    test("find() génère un INNER JOIN", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([
            [{ id: 1, name: "john" }]
        ]);

        await model.find({
            select: ["id", "name"],
            join: {
                table: "roles",
                on: "`users`.`role_id` = `roles`.`id`"
            }
        });

        const sql = mockExecute.mock.calls[0][0];

        expect(sql).toContain("INNER JOIN");
    });

    test("delete() doit propager une erreur SQL", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockRejectedValue(new Error("DELETE ERROR"));

        await expect(
            model.delete({ id: 1 })
        ).rejects.toThrow(Error);
    });

    test("customRequest() retourne une instance", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([
            [{ id: 1 }]
        ]);

        const result = await model.customRequest(
            "SELECT * FROM users"
        );

        expect(result).toBeDefined();
    });

    test("customRequest() retourne 0 si vide", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([[]]);

        const result = await model.customRequest(
            "SELECT * FROM users"
        );

        expect(result).toBe(0);
    });

    test("customRequest() propage une erreur SQL", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockRejectedValue(
            new Error("CUSTOM ERROR")
        );

        await expect(
            model.customRequest("SELECT")
        ).rejects.toThrow("CUSTOM ERROR");
    });

    test("dropTable() exécute la requête", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([{}]);

        await model.dropTable();

        expect(mockExecute).toHaveBeenCalled();
    });

    test("dropTable() propage une erreur SQL", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockRejectedValue(
            new Error("DROP ERROR")
        );

        await expect(
            model.dropTable()
        ).rejects.toThrow("DROP ERROR");
    });

    test("generateCreateTableStatement() génère un CREATE TABLE", () => {
        const model = new Model("users", {
            schemaDict: {}
        });

        const sql = model.generateCreateTableStatement({
            id: {
                type: Number,
                primary_key: true
            }
        });

        expect(sql).toContain("CREATE TABLE");
    });

    test("generateCreateTableStatement() refuse SELECT comme nom de table", () => {
        const model = new Model("SELECT", {
            schemaDict: {}
        });

        const result = model.generateCreateTableStatement({
            id: { type: Number }
        });

        expect(result).toBeUndefined();
    });

    test("syncAllTables() traite les modèles en attente", async () => {
        Model.pendingModels = [];

        new Model("users", {
            schemaDict: {
                id: {
                    type: Number
                }
            }
        });

        mockExecute.mockResolvedValue([{}]);

        await Model.syncAllTables();

        expect(mockExecute).toHaveBeenCalled();
    });

    test("generateCreateTableStatement() couvre les types spéciaux", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            active: {
                type: Boolean,
                default: true
            },
            score: {
                type: "Float",
                default: 12.5
            },
            metadata: {
                type: Object,
                default: { test: true }
            },
            created_at: {
                type: Date,
                default: "CURRENT_TIMESTAMP"
            }
        });

        expect(sql).toContain("BOOLEAN");
        expect(sql).toContain("FLOAT");
        expect(sql).toContain("JSON");
        expect(sql).toContain("CURRENT_TIMESTAMP");
    });

    test("generateCreateTableStatement() refuse les types inconnus", () => {
        const model = new Model("users", { schemaDict: {} });

        expect(() => {
            model.generateCreateTableStatement({
                test: {
                    type: "BananaType"
                }
            });
        }).toThrow();
    });

    test("generateCreateTableStatement() couvre field.type qui est une string", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            age: {
                type: "Number"
            }
        });

        expect(sql).toContain("INT");
    });

    test("generateCreateTableStatement() couvre field.name", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            created_at: Date
        });

        expect(sql).toContain("DATETIME");
    });

    test("syncAllTables avec foreign key", async () => {
        Model.pendingModels = [];

        new Model("roles", {
            schemaDict: {
                id: {
                    type: Number
                }
            }
        });

        new Model("users", {
            schemaDict: {
                role_id: {
                    type: Number,
                    foreignKey: "roles(id)"
                }
            }
        });

        mockExecute.mockResolvedValue([{}]);

        await Model.syncAllTables();

        expect(mockExecute).toHaveBeenCalled();
    });

    test("syncAllTables propage les erreurs SQL", async () => {
        Model.pendingModels = [];

        new Model("users", {
            schemaDict: {
                id: {
                    type: Number
                }
            }
        });

        mockExecute.mockRejectedValue(
            new Error("CREATE ERROR")
        );

        await expect(
            Model.syncAllTables()
        ).rejects.toThrow("CREATE ERROR");
    });

    test("ENUM sans type", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            status: {
                enum: ["OPEN", "CLOSED"]
            }
        });

        expect(sql).toContain("status ENUM");
    });

    test("find conserve les objets select", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([[{ id: 1 }]]);

        await model.find({
            select: [
                {
                    count: "*",
                    as: "total"
                }
            ]
        });

        expect(mockExecute).toHaveBeenCalled();
    });
    test("delete retourne 1 si suppression", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([
            {
                affectedRows: 1
            }
        ]);

        const result = await model.delete({
            id: 1
        });

        expect(result).toBe(1);
    });

    test("generate_uuid retourne un uuid unique", async () => {
        mockExecute
            .mockResolvedValueOnce([
                [{ "UUID()": "uuid-test" }]
            ])
            .mockResolvedValueOnce([
                [{ "COUNT(*)": 0 }]
            ]);

        const result = await testModel.generate_uuid();

        expect(result).toBe("uuid-test");
    });

    test("generateCreateTableStatement supporte un constructeur JS", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            created_at: Date
        });

        expect(sql).toContain("DATETIME");
    });

    test("default fonction sur un type Date", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            created_at: {
                type: Date,
                default: () => new Date()
            }
        });

        expect(sql).toContain("DEFAULT CURRENT_TIMESTAMP");
    });

    test("default Date", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            created_at: {
                type: Date,
                default: new Date("2024-01-01T12:00:00Z")
            }
        });

        expect(sql).toContain("2024-01-01");
    });

    test("default avec un symbole", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            test: {
                type: String,
                default: Symbol.for("hello")
            }
        });

        expect(sql).toContain("hello");
    });

    test("primary_key et unique sont incompatibles", () => {
        const model = new Model("users", { schemaDict: {} });

        expect(() =>
            model.generateCreateTableStatement({
                id: {
                    type: Number,
                    primary_key: true,
                    unique: true
                }
            })
        ).toThrow();
    });

    test("enum avec type défini", () => {
        const model = new Model("users", { schemaDict: {} });

        const sql = model.generateCreateTableStatement({
            role: {
                type: String,
                enum: ["ADMIN", "USER"]
            }
        });

        expect(sql).toContain("ENUM");
    });

    test("save retourne le premier résultat mysql", async () => {
        const model = new Model("users", { schemaDict: {} });

        mockExecute.mockResolvedValue([
            {
                insertId: 123,
                affectedRows: 1
            }
        ]);

        const result = await model.save({
            name: "john"
        });

        expect(result).toEqual({
            insertId: 123,
            affectedRows: 1
        });
    });

    test("generate_uuid retourne un uuid unique", async () => {
        mockExecute
            .mockResolvedValueOnce([
                [{ "UUID()": "uuid-123" }]
            ])
            .mockResolvedValueOnce([
                [{ "COUNT(*)": 0 }]
            ]);

        const result = await testModel.generate_uuid();

        expect(result).toBe("uuid-123");
    });
});