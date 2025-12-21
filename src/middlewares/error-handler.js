const logError = require('../utilities/logger');

const errorHandler = (err, req, res, next) => {
    
    logError(err, req);

    res.status(err.statusCode || 500).json({
        success: false,
        message:
            process.env.NODE_ENV === 'development'
                ? err.message
                : 'Internal Server Error Hello World',
    });
};

module.exports = errorHandler;
