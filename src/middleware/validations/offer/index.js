const { jobTypes } = require('../../../constants/enum');
const { validateRequest } = require('../validate-request');
const Joi = require('joi');

const offerValidation = (req, res, next) => {
    const schema = Joi.object({
        freelancer_id: Joi.string().required(),
        job_id: Joi.string().required(),
        budget: Joi.number().required(),
        job_type: Joi.string().valid(jobTypes.HOURLY, jobTypes.FIXED).required(),
        contract_title: Joi.string().required(),
        job_title: Joi.string().required(),
        hiring_team: Joi.string().required(),
        hourly_rate: Joi.number().when('job_type', {
            is: Joi.string().valid(jobTypes.HOURLY),
            then: Joi.number().required()
        }),
        weekly_limit: Joi.number().when('job_type', {
            is: Joi.string().valid(jobTypes.HOURLY),
            then: Joi.number().required()
        }),
        project_budget: Joi.number().when('job_type', {
            is: Joi.string().valid(jobTypes.FIXED),
            then: Joi.number().required()
        }),
    })
    validateRequest(req, res, schema, next);
}

const offerUpdateValidation = (req, res, next) => {
    const schema = Joi.object({
        offer_id: Joi.string().required(),
        job_id: Joi.string().required(),
        status: Joi.string().required()
    })
    validateRequest(req, res, schema, next);
}
const endContractValidation = (req, res, next) => {
    const schema = Joi.object({
        user_id: Joi.string().required(),
        job_id: Joi.string().required(),
        status: Joi.string().required()
    })
    validateRequest(req, res, schema, next);
}

module.exports = {
    offerValidation,
    offerUpdateValidation,
    endContractValidation
}