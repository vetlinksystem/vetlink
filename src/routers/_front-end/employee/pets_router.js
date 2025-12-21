const express = require('express');
const path = require('path');
const { ensureAuthPage, ensureTypePage, authenticateApi, ensureTypeApi } = require('../../../middlewares/auth');

const managePetsRouter = express.Router();
const publicPath = path.resolve(__dirname, '../../../public');

managePetsRouter.use(express.static(publicPath));

managePetsRouter.get('/pets', ensureAuthPage, ensureTypePage('employee'), (req, res) => {
    res.sendFile(path.join(publicPath, 'employee/html/pets.html'));
});

module.exports = managePetsRouter;