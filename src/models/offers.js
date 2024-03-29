const mongoose = require('mongoose');
const { budgetType, experienceType, jobTypes } = require('../constants/enum');

const OfferSchema = mongoose.Schema({
    freelancer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'freelancer_profiles',
        required: true,
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client_profiles',
        required: true,
    },
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'jobs',
        required: true,
    },
    status: {
        type: String,
        default: 'pending'
    },
    budget: {
        type: Number,
        required: true
    },
    hiring_team: {
        type: String,
        required: true
    },
    job_title: {
        type: String,
        required: true
    },
    contract_title: {
        type: String,
        required: true
    },
    job_type: {
        type: String,
        enum: [jobTypes.HOURLY, jobTypes.FIXED],
        required: true
    },
    experience: {
        type: String,
        enum: [experienceType.ENTRY, experienceType.EXPERT, experienceType.INTERMEDIATE]
    },
    hourly_rate: {
        type: Number,
        required: function () {
            return this.job_type === jobTypes.HOURLY
        },
    },
    project_budget: {
        type: Number,
        required: function () {
            return this.job_type === jobTypes.FIXED
        },
    },
    weekly_limit: {
        type: Number,
        required: function () {
            return this.job_type === jobTypes.HOURLY
        },
    },
    allow_freelancer_manually_timelog: {
        type: Boolean,
        required: true,
        default: false
    },
    accept_terms_condition: {
        type: Boolean,
        required: true,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('offers', OfferSchema);

