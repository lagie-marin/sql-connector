const { escapeIdentifier, escapeIdentifierList, escapeValue, escapeOrderDirection } = require('../src/utils/sql');

describe('Utils - sql.js', () => {
    describe('escapeIdentifier', () => {
        test('Devrait renvoyer "*" inchangé', () => {
            expect(escapeIdentifier('*')).toBe('*');
        });

        test('Devrait formater un identifiant simple avec des backticks', () => {
            expect(escapeIdentifier('users')).toBe('`users`');
        });

        test('Devrait nettoyer les backticks existants (normalisation)', () => {
            expect(escapeIdentifier('`users`')).toBe('`users`');
        });

        test('Devrait gérer les identifiants composites sépares par un point', () => {
            expect(escapeIdentifier('users.id')).toBe('`users`.`id`');
            expect(escapeIdentifier('users.*')).toBe('`users`.*');
        });

        test('Devrait lever une erreur si l’identifiant n’est pas une chaîne de caractères ou vide', () => {
            expect(() => escapeIdentifier('')).toThrow('Invalid SQL identifier');
            expect(() => escapeIdentifier(null)).toThrow('Invalid SQL identifier');
        });

        test('Devrait lever une erreur en cas de tentative d’injection de caractères non autorisés', () => {
            expect(() => escapeIdentifier('users; DROP TABLE users;')).toThrow('Invalid SQL identifier');
            expect(() => escapeIdentifier('users-table')).toThrow('Invalid SQL identifier');
            expect(() => escapeIdentifier('users.id;--')).toThrow('Invalid SQL identifier');
        });
    });

    describe('escapeIdentifierList', () => {
        test('Devrait joindre et échapper une liste d’identifiants', () => {
            expect(escapeIdentifierList(['id', 'email'])).toBe('`id`, `email`');
        });
    });

    describe('escapeValue', () => {
        test('Devrait déléguer l’échappement de valeurs de manière sécurisée', () => {
            expect(escapeValue("John's")).toBe("'John\\'s'");
            expect(escapeValue(42)).toBe('42');
        });
    });

    describe('escapeOrderDirection', () => {
        test('Devrait normaliser en majuscule ASC et DESC', () => {
            expect(escapeOrderDirection('asc')).toBe('ASC');
            expect(escapeOrderDirection('DESC')).toBe('DESC');
        });

        test('Devrait retourner ASC par défaut si null ou undefined', () => {
            expect(escapeOrderDirection(null)).toBe('ASC');
            expect(escapeOrderDirection(undefined)).toBe('ASC');
        });

        test('Devrait lever une erreur pour toute direction invalide', () => {
            expect(() => escapeOrderDirection('INJECTION;')).toThrow('Invalid SQL sort direction');
        });
    });
});