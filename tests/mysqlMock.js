const mockExecute = jest.fn();
const mockEnd = jest.fn((callback) => { if (callback) callback(null); });

const mockPool = {
    promise: () => ({
        execute: mockExecute
    }),
    end: mockEnd
};

jest.mock('mysql2', () => {
    // Le require est fait à l'intérieur du callback au moment de l'exécution
    const mysql2Actual = jest.requireActual('mysql2');
    
    return {
        createPool: jest.fn(() => mockPool),
        escape: mysql2Actual.escape,
        escapeId: mysql2Actual.escapeId
    };
});

module.exports = { mockExecute, mockEnd, mockPool };