const { messageConstants } = require("../../constants");
const { getUserData } = require("../../middleware");
const offerService = require('../../service/offer');
const { logger } = require("../../utils");


const sendOffer = async (req, res) => {
    try {
        const userData = await getUserData(req, res);
        const response = await offerService.sendOffer(req.body, userData, res);
        logger.info(`${messageConstants.RESPONSE_FROM} Send offer API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`Send offer API ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

module.exports = {
    sendOffer
}