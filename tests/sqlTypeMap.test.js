const { sqlTypeMap } = require('../src/utils/sqlTypeMap');

describe('Utils - sqlTypeMap.js', () => {
    test('Devrait posséder les correspondances de types standards indispensables', () => {
        expect(sqlTypeMap.String).toBe('VARCHAR');
        expect(sqlTypeMap.Number).toBe('INT');
        expect(sqlTypeMap.Boolean).toBe('BOOLEAN');
        expect(sqlTypeMap.Date).toBe('DATETIME');
        expect(sqlTypeMap.Object).toBe('JSON');
    });

    test('Devrait retourner les valeurs temporelles par défaut configurées', () => {
        expect(sqlTypeMap.Now).toBe('NOW()');
        expect(sqlTypeMap.CurrentTimestamp).toBe('CURRENT_TIMESTAMP');
    });
});