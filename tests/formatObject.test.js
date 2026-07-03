const formatObject = require('../src/utils/formatObject');

describe('Utils - formatObject.js', () => {
    test('Devrait convertir les instances de Date au format DATETIME MySQL local', () => {
        const date = new Date('2026-07-03T12:34:56.789Z');
        const result = formatObject({ createdAt: date });
        expect(result.createdAt).toBe('2026-07-03 12:34:56');
    });

    test('Devrait supprimer les quotes enveloppantes des chaînes de caractères', () => {
        const result = formatObject({
            single: "'hello'",
            double: '"world"',
            normal: 'text'
        });
        expect(result.single).toBe('hello');
        expect(result.double).toBe('world');
        expect(result.normal).toBe('text');
    });

    test('Devrait déséchapper les quotes protégées d’une chaîne', () => {
        const result = formatObject({ text: "John\\'s corporate \\\"value\\\"" });
        expect(result.text).toBe('John\'s corporate "value"');
    });

    test('Devrait sérialiser les objets imbriqués en JSON et échapper les single quotes', () => {
        const result = formatObject({ meta: { role: "owner's", active: true } });
        // L'objet devient une chaîne JSON avec les single quotes échappées par un double antislash
        expect(result.meta).toBe('{"role":"owner\\\'s","active":true}');
    });

    test('Devrait ignorer et laisser inchangés les types primitifs non ciblés (nombres, booléens)', () => {
        const result = formatObject({ age: 25, isValid: true });
        expect(result.age).toBe(25);
        expect(result.isValid).toBe(true);
    });
});