const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const petsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

petsRouter.use(express.static(publicPath));

petsRouter.get('/pets', ensureAuthPage, ensureTypePage('client'), (req, res) => {
    res.sendFile(path.join(publicPath, 'client/html/pets.html'));
});

module.exports = petsRouter;