const createError = require('http-errors');
const bodyParser = require('body-parser');
const express = require('express');
const logger = require('morgan');
const path = require('path');
require('dotenv').config();

const env = process.env.NODE_ENV || "development";
const config = require(path.join(__dirname, 'config', 'config.json'))[env];

const admisionRouter = require('./app/controllers/admision/admision.controller');

const app = express();

console.log("entorno",env);

app.set('config', config);
app.set('dbConfig', {
    server: config.server,
    database: config.database,
    user: config.user,
    password: config.password,
    port: config.port
});

app.set('BDINTBANNERConfig', {
    server: config.dbintbanner.server,
    database: config.dbintbanner.database,
    user: config.dbintbanner.user,
    password: config.dbintbanner.password,
    port: config.dbintbanner.port
});

app.use(logger('dev'));
app.use(bodyParser.json({
    limit: '5000mb'
}));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use('/admision', admisionRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.send(res);

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);

    res.send('error');
});



module.exports = app;
