const authValidator = require('./auth');
const paymentValidator = require('./payment');
const inviteValidator = require('./invite');
const commentValiator = require('./comment');
const goalValidatior = require('./goal');
const sessionValidator = require('./session');
const boardValidator = require('./board');
const offerValidator = require('./offer');
const jobValidation = require('./job');
const agencyValidation = require('./agency');

module.exports = {
    authValidator,
    paymentValidator,
    inviteValidator,
    commentValiator,
    sessionValidator,
    goalValidatior,
    boardValidator,
    offerValidator,
    jobValidation,
    agencyValidation
}