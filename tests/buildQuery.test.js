const { buildSelect, buildQueryParts } = require('../src/utils/buildQuery');

describe('Utils - buildQuery.js', () => {
    describe('buildSelect', () => {
        test('Devrait renvoyer "*" si le select est absent ou vide', () => {
            expect(buildSelect()).toBe('*');
            expect(buildSelect([])).toBe('*');
        });

        test('Devrait concaténer les colonnes simples séparées par des retours à la ligne', () => {
            expect(buildSelect(['id', 'name'])).toBe('`id`,\n`name`');
        });

        test('Devrait gérer l’agrégation SUM avec alias optionnel', () => {
            expect(buildSelect([{ sum: 'price' }])).toBe('SUM(`price`) AS `price`');
            expect(buildSelect([{ sum: 'price', as: 'total' }])).toBe('SUM(`price`) AS `total`');
        });

        test('Devrait gérer DATE_FORMAT et appliquer l’échappement sur la colonne', () => {
            const select = [{ dateFormat: ['createdAt', '%Y-%m'], as: 'month' }];
            expect(buildSelect(select)).toBe("DATE_FORMAT(`createdAt`, '%Y-%m') AS `month`");
        });

        test('Devrait gérer une colonne simple déclarée via un objet avec alias', () => {
            expect(buildSelect([{ col: 'role', as: 'user_role' }])).toBe('`role` AS `user_role`');
        });
    });

    describe('buildQueryParts', () => {

        test('Devrait traiter correctement la clause WHERE sous forme d\'objet structuré (Cas nominal sécurisé)', () => {
            const options = { where: { status: 'active', role: 'admin' } };

            // L'objet est nettoyé et les colonnes sont échappées avec des backticks
            expect(buildQueryParts(options)).toEqual("WHERE `status` = 'active' AND `role` = 'admin'");
        });

        test('Devrait lever une erreur si la clause WHERE est passée sous forme de chaîne brute (Protection Injection SQL)', () => {
            const optionsInvalides = { where: 'WHERE id = 1 OR 1=1' };

            expect(() => buildQueryParts(optionsInvalides)).toThrow(
                'Raw string WHERE clauses are not allowed. Use a structured filter instead.'
            );
        });
        test('Devrait traiter la clause WHERE (chaîne brute ou objet)', () => {
            expect(buildQueryParts({ where: 'id = 1' })).toEqual('WHERE id = 1');
            expect(buildQueryParts({ where: { status: 'ok' } })).toEqual("WHERE `status` = 'ok'");
        });

        test('Devrait générer la clause GROUP BY et parser correctement DATE_FORMAT', () => {
            const options = { groupBy: ['role', "DATE_FORMAT(createdAt, '%Y')"] };
            expect(buildQueryParts(options)).toEqual("GROUP BY `role`, DATE_FORMAT(`createdAt`, '%Y')");
        });

        test('Devrait lever une erreur si la clause HAVING est passée sous forme de chaîne brute', () => {
            expect(() => buildQueryParts({ having: 'count > 1' })).toThrow(
                'Raw string HAVING clauses are not allowed. Use a structured filter instead.'
            );
        });

        test('Devrait traiter la clause ORDER BY (chaîne simple ou objet structuré)', () => {
            const options = {
                orderBy: ['name', { field: 'id', direction: 'DESC' }]
            };
            expect(buildQueryParts(options)).toEqual('ORDER BY `name`, `id` DESC');
        });

        test('Devrait accepter la clause LIMIT si elle est un entier valide', () => {
            expect(buildQueryParts({ limit: 10 })).toEqual("LIMIT 10");
            expect(buildQueryParts({ limit: 0 })).toEqual("");
        });

        test('Devrait lever une erreur si la clause LIMIT est invalide', () => {
            expect(() => buildQueryParts({ limit: -5 })).toThrow('Invalid LIMIT value');
            expect(() => buildQueryParts({ limit: 10.5 })).toThrow('Invalid LIMIT value');
            expect(() => buildQueryParts({ limit: 'abc' })).toThrow('Invalid LIMIT value');
        });
    });
});

describe('buildQuery - Advanced Fields & Aggregations', () => {

    test('Should safely compile COUNT(*) aggregated calculations with an expression alias', () => {
        const fields = [{ count: '*', as: 'total_user' }];
        expect(buildSelect(fields)).toBe('COUNT(*) AS `total_user`');
    });

    test('Should safely compile COUNT(column) on structured column identifiers', () => {
        const fields = [{ count: 'id', as: 'unique_ids' }];
        expect(buildSelect(fields)).toBe('COUNT(`id`) AS `unique_ids`');
    });

    test('Should correctly process multi-column GROUP BY arrays to avoid ONLY_FULL_GROUP_BY validation issues', () => {
        const options = { 
            select: ['status', 'email', { count: '*', as: 'total_user' }], 
            groupBy: ['status', 'email'] 
        };
        const parts = buildQueryParts(options);

        expect(parts).toContain('GROUP BY `status`, `email`');
    });
});