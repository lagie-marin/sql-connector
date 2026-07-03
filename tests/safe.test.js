const { getSafe, setSafe } = require('../src/utils/security/safe');

describe('Utils - safe.js', () => {
    describe('getSafe', () => {
        test('Devrait lire une propriété existante valide', () => {
            const obj = { name: 'Alice' };
            expect(getSafe(obj, 'name')).toBe('Alice');
        });

        test('Devrait renvoyer undefined pour une propriété absente', () => {
            const obj = { name: 'Alice' };
            expect(getSafe(obj, 'age')).toBeUndefined();
        });

        test('Devrait bloquer l’accès aux propriétés interdites (Pollution de Prototype)', () => {
            const obj = {};
            expect(getSafe(obj, '__proto__')).toBeUndefined();
            expect(getSafe(obj, 'constructor')).toBeUndefined();
            expect(getSafe(obj, 'prototype')).toBeUndefined();
        });

        test('Devrait gérer un objet null ou indéfini sans lever d’erreur', () => {
            expect(getSafe(null, 'name')).toBeUndefined();
            expect(getSafe(undefined, 'name')).toBeUndefined();
        });
    });

    describe('setSafe', () => {
        test('Devrait assigner une valeur à une clé valide', () => {
            const obj = {};
            const result = setSafe(obj, 'age', 30);
            expect(result).toBe(true);
            expect(obj.age).toBe(30);
        });

        test('Devrait refuser d’assigner des clés interdites et renvoyer false', () => {
            const obj = {};
            expect(setSafe(obj, '__proto__', { polluted: true })).toBe(false);
            expect(setSafe(obj, 'constructor', {})).toBe(false);
            expect(setSafe(obj, 'prototype', {})).toBe(false);
            expect(obj.__proto__.polluted).toBeUndefined();
        });

        test('Devrait renvoyer false si l’objet cible n’est pas valide', () => {
            expect(setSafe(null, 'key', 'val')).toBe(false);
        });
    });
});