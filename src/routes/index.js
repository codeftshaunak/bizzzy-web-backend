const express = require('express');
const api = express.Router();

//Router define
const routes = [
    `auth`,
    `country`,
    `job`,
    `jobProposal`,
    `message`,
    `invite`
];

routes.forEach((route) => require(`./${route}`)(api))
module.exports = api;
