// 1. CHARGER LE MOCK EN PREMIER
const { mockPool, mockEnd } = require('./mysqlMock'); 

// 2. CHARGER LES MODULES DU PROJET ENSUITE
const { connect, logout } = require('../src/db/connect'); // Ajustez le chemin vers votre dossier src
const { getConnexion } = require('../src/db/connexion');
const mysql = require('mysql2');

describe("Tests unitaires avec Mock - connect.js", () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("connect() devrait créer un pool mysql2 et définir la connexion globale", async () => {
        const config = { host: 'localhost', user: 'root', database: 'test' };
        
        await connect(config);

        // Maintenant mysql.createPool est bien un mock Jest !
        expect(mysql.createPool).toHaveBeenCalledWith(config);
        expect(getConnexion()).toBe(mockPool);
    });

    test("logout() devrait fermer proprement la connexion du pool", async () => {
        // On simule une connexion active d'abord
        const { setConnexion } = require('../src/db/connexion');
        setConnexion(mockPool);

        await logout();
        
        expect(mockEnd).toHaveBeenCalled();
    });
});