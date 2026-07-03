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
});