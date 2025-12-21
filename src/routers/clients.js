    const express = require('express');
    const clientRouters = express.Router();

    const addClientConroller = require('../controllers/clients/add');
    const getClientController = require('../controllers/clients/get');
    const getAllClientController = require('../controllers/clients/get_all');
    const updateClientController = require('../controllers/clients/update');
    const deleteClientControler = require('../controllers/clients/delete');

    clientRouters.post('/add', addClientConroller);
    clientRouters.put('/get', getClientController);
    clientRouters.get('/get-all', getAllClientController);
    clientRouters.put('/update', updateClientController);
    clientRouters.delete('/delete', deleteClientControler);

    module.exports = clientRouters;