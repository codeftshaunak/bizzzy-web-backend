const uuid = require('uuid');
const mongoose = require('mongoose');
const { required } = require('joi');

const socketSchema = mongoose.Schema({
    _id: {
        type: String,
        default: () => uuid.v4().replace(/\-/g, ""),
        required: true
    },
    socket_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true,
        index: { unique: true }
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    updated_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    is_deleted: {
        type: Boolean,
        required: true,
        default: false
    },
    status: {
        type: Number,
        required: true,
        default: 1
    }
})

module.exports = mongoose.model('socket', socketSchema);