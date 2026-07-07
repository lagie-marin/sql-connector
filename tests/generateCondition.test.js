const generateCondition = require('../src/utils/generateCondition');
const { Schema } = require('../src/models/Schema');

describe('Utils - generateCondition.js', () => {
    test('Devrait générer une chaîne classique de conditions WHERE (isUpdate = false)', () => {
        const filter = { status: 'active', age: 18 };
        const result = generateCondition(filter, false);
        expect(result).toBe("`status` = 'active' AND `age` = 18");
    });

    test('Devrait générer une chaîne d\'assignations SET (isUpdate = true)', () => {
        const data = { email: 'test@test.com', updated: 1 };
        const result = generateCondition(data, true);
        expect(result).toBe("`email` = 'test@test.com' , `updated` = 1");
    });

    test('Devrait générer un opérateur IN lorsqu\'une valeur est un tableau', () => {
        const filter = { id: [1, 2, 3] };
        const result = generateCondition(filter, false);
        expect(result).toBe('`id` IN (1, 2, 3)');
    });

    test('Devrait générer "IS NULL" pour les filtres et conserver l\'assignation brute en cas d\'Update', () => {
        expect(generateCondition({ deletedAt: null }, false)).toBe('`deletedAt` IS NULL');
        expect(generateCondition({ deletedAt: null }, true)).toBe('`deletedAt` = NULL');
    });

    test('Devrait convertir une chaîne date ISO au format MySQL si spécifiée dans le Schéma', () => {
        const schema = new Schema({
            publishedAt: { type: Date }
        });
        const filter = { publishedAt: '2026-07-03T15:00:00.000Z' };
        const result = generateCondition(filter, false, schema);
        expect(result).toBe("`publishedAt` = '2026-07-03 15:00:00'");
    });

    test('Devrait nettoyer les guillemets de protection d\'une chaîne de caractères', () => {
        const filter = { name: '"Alice"' };
        expect(generateCondition(filter, false)).toBe("`name` = 'Alice'");
    });

    test("generateCondition utilise les champs unique du schema", () => {
        const result = generateCondition(
            { email: "john@test.fr" },
            false,
            {
                schemaDict: {
                    email: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("email");
    });

    test("generateCondition génère un IN pour les champs uniques tableau", () => {
        const result = generateCondition(
            { email: ["a@test.fr", "b@test.fr"] },
            false,
            {
                schemaDict: {
                    email: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("IN");
    });

    test("generateCondition génère un JSON_CONTAINS pour objet unique", () => {
        const result = generateCondition(
            {
                metadata: {
                    role: "admin"
                }
            },
            false,
            {
                schemaDict: {
                    metadata: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("JSON_CONTAINS");
    });

    test("generateCondition génère IS NULL pour champ unique", () => {
        const result = generateCondition(
            { email: null },
            false,
            {
                schemaDict: {
                    email: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("IS NULL");
    });

    test("generateCondition convertit une date ISO sur champ unique", () => {
        const result = generateCondition(
            {
                created_at: "2025-01-01T10:00:00Z"
            },
            false,
            {
                schemaDict: {
                    created_at: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("2025-01-01 10:00:00");
    });

    test("generateCondition update JSON", () => {
        const result = generateCondition(
            {
                metadata: {
                    role: "admin"
                }
            },
            true
        );

        expect(result).toContain("=");
        expect(result).not.toContain("JSON_CONTAINS");
    });

    test("generateCondition filtre JSON", () => {
        const result = generateCondition(
            {
                metadata: {
                    role: "admin"
                }
            },
            false
        );

        expect(result).toContain("JSON_CONTAINS");
    });

    test("generateCondition retourne une condition simple", () => {
        const result = generateCondition(
            { id: 42 },
            false
        );

        expect(result).toContain("42");
    });

    test("generateCondition retire les guillemets doubles entourant une valeur", () => {
        const result = generateCondition(
            { name: '"john"' },
            false,
            {
                schemaDict: {
                    name: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("john");
        expect(result).not.toContain('"john"');
    });

    test("generateCondition utilise JSON_CONTAINS avec une chaîne JSON", () => {
        const result = generateCondition(
            {
                metadata: '{"role":"admin"}'
            },
            false,
            {
                schemaDict: {
                    metadata: {
                        unique: true
                    }
                }
            }
        );

        expect(result).toContain("JSON_CONTAINS");
    });

    test("generateCondition détecte une chaîne JSON", () => {
        const result = generateCondition({
            metadata: '{"role":"admin"}'
        });

        expect(result).toContain("JSON_CONTAINS");
    });

    test("generateCondition supporte fieldDef.type string", () => {
        generateCondition(
            {
                created_at: "2025-01-01T10:00:00Z"
            },
            false,
            {
                schemaDict: {
                    created_at: {
                        type: "Date"
                    }
                }
            }
        );
    });

    test("generateCondition convertit une date ISO pour un champ Date", () => {
        const result = generateCondition(
            {
                created_at: "2025-01-01T10:00:00Z"
            },
            false,
            {
                schemaDict: {
                    created_at: {
                        type: Date
                    }
                }
            }
        );

        expect(result).toContain("2025-01-01 10:00:00");
    });

});