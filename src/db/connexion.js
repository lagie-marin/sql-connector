let connexion = null;
module.exports = {
    getConnexion: () => connexion,
    setConnexion: (c) => { connexion = c; }
};