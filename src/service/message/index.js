const { messageConstants, responseData } = require("../../constants");
const { logger } = require("../../utils");
const MessageSchema = require('../../models/message');

const getMessageList = (req, user, res) => {
    return new Promise(async () => {
        logger.info(`Message ${messageConstants.LIST_API_CALL_SUCCESSFULLY}`);
        const query = [
            {
                $match: {
                    $or: [
                        {
                            sender_id: user._id,
                            receiver_id: req.query.user_id,
                        },
                        {
                            sender_id: req.query.user_id,
                            receiver_id: user._id,
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sender_id',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, email: 1 } }
                    ],
                    as: 'sender_details'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'receiver_id',
                    foreignField: '_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, email: 1 } }
                    ],
                    as: 'receiver_details'
                }
            }
        ]
        await MessageSchema.aggregate(query).then(async (result) => {
            if (result.length !== 0) {
                logger.info(`Message ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                return responseData.success(res, result, `Message ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
            } else {
                logger.info(`Message ${messageConstants.LIST_NOT_FOUND}`);
                return responseData.success(res, [], `Message ${messageConstants.LIST_NOT_FOUND}`);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}

const getChatUserList = (req, user, res) => {
    return new Promise(async () => {
        logger.info(`Chat user ${messageConstants.LIST_API_CALL_SUCCESSFULLY}`);
        const query = [
            {
                $match: {
                    $or: [{ sender_id: user._id }, { receiver_id: user._id }],
                },
            },
            // Look up the invitation collection to check the invitation status
            {
                $lookup: {
                    from: 'invitations',
                    let: { chat_sender_id: '$sender_id', chat_receiver_id: '$receiver_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $and: [
                                                { $eq: ['$sender_id', '$$chat_sender_id'] },
                                                { $eq: ['$receiver_id', '$$chat_receiver_id'] },
                                                { $eq: ['$status', 1] }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ['$sender_id', '$$chat_receiver_id'] },
                                                { $eq: ['$receiver_id', '$$chat_sender_id'] },
                                                { $eq: ['$status', 1] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'invitation_details'
                }
            },
            // Filter those messages where invitation details exist and are accepted
            {
                $match: {
                    'invitation_details.status': 1
                }
            },
            {
                $project: {
                    chatId: '$_id',
                    otherParty: {
                        $cond: [
                            { $eq: ['$sender_id', user._id] },
                            '$receiver_id',
                            '$sender_id',
                        ],
                    },
                    lastMessage: '$message',
                    timestamp: '$created_at',
                },
            },
            {
                $group: {
                    _id: '$otherParty',
                    chatId: { $first: '$chatId' },
                    lastMessage: { $last: '$lastMessage' },
                    timestamp: { $last: '$timestamp' },
                },
            },
            {
                $sort: { timestamp: -1 },
            },
            {
                $lookup: {
                    from: 'user_profiles',
                    localField: '_id',
                    foreignField: 'user_id',
                    pipeline: [
                        { $project: { _id: 1, name: 1, profile_image: 1 } }
                    ],
                    as: 'user_profile_details'
                }
            }
        ]
        await MessageSchema.aggregate(query).then(async (result) => {
            if (result.length !== 0) {
                logger.info(`Chat User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                return responseData.success(res, result, `Chat User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
            } else {
                logger.info(`Chat user ${messageConstants.LIST_NOT_FOUND}`);
                return responseData.success(res, [], `Chat User ${messageConstants.LIST_NOT_FOUND}`);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}


module.exports = {
    getMessageList,
    getChatUserList
}