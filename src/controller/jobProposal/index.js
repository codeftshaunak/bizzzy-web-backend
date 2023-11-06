const jobProposalService = require('../../service/jobProposal');
const { messageConstants } = require('../../constants');
const { logger } = require('../../utils');

const createJobProposal = async (req, res) => {
    try {
        req.body.userId = req.userId
        const response = await jobProposalService.createJobProposal(req.body, res);
        logger.info(`${messageConstants.RESPONSE_FROM} createJobProposal API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`createJobProposal ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

// will be used by user to see his/her job proposals
const getJobProposalByUserId = async (req, res) => {
    try {
        const response = await jobProposalService.getJobProposalByUserId(req.params, res);
        logger.info(`${messageConstants.RESPONSE_FROM} getJobProposalByUserId API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`getJobProposalByUserId ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}

// will be used by client to see job proposals on his job
const getJobProposalByJobId = async (req, res) => {
    try {
        const response = await jobProposalService.getJobProposalByJobId(req.params, res);
        logger.info(`${messageConstants.RESPONSE_FROM} getJobProposalByJobId API`, JSON.stringify(response));
        res.send(response);
    } catch (err) {
        logger.error(`herrrrrrrrreeeeeee`);
        logger.error(`getJobProposalByJobId ${messageConstants.API_FAILED} ${err}`);
        res.send(err);
    }
}


module.exports = {
    createJobProposal,
    getJobProposalByUserId,
    getJobProposalByJobId
}