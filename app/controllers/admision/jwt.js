const JWT = require('jsonwebtoken');

module.exports = {

    getToken(req, res, next) {
    
        try {
            const expiresSeconds = 600;
            const { JWT_KEY_CONTINUA } = req.app.get('config');
            const token = JWT.sign({ fecha : new Date() },JWT_KEY_CONTINUA,{ expiresIn: expiresSeconds});
            res.status(200).send({
                token: token,
                expiresin: new Date(Date.now() + (expiresSeconds * 1000)).toLocaleString('es-PE', {timeZone: 'America/Lima'})
            });
        } catch (error) {
            res.status(500).send({
                error: error
            });
        }
 
    },

    validateJWTToken(req){

        const responseValue = {
            status: null,
            message: null
        }

        responseValue.status = 0;

        const token = req.headers["authorization"];

        if (!token) {
            responseValue.status = 403;
            responseValue.message = 'Un token es requerido para la autenticacón';
        }

        try {
            const { JWT_KEY_CONTINUA } = req.app.get('config');
            JWT.verify(token, JWT_KEY_CONTINUA);
        } catch (error) {
            responseValue.status = 401;
            responseValue.message = 'Token invalido';
        }

    return responseValue;
    },
};