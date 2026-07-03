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
});