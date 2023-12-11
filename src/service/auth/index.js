const uuid = require('uuid');
const { responseData, messageConstants, mailSubjectConstants, mailTemplateConstants } = require("../../constants");
const { cryptoGraphy, jsonWebToken } = require("../../middleware");
const UserSchema = require('../../models/users');
const { logger, mail } = require("../../utils");
const ProfileSchema = require('../../models/profile');
const FeedbackSchema = require('../../models/feedback');
const mongoose = require('mongoose');
const StrengthsSchema = require('../../models/strengths');
const ReasonsSchema = require('../../models/reason_for_ending_contract');
const FeedbackOptionsSchema = require('../../models/feedback_options');

const signUp = async (body, res) => {
    return new Promise(async () => {
        body['password'] = cryptoGraphy.encrypt(body.password);
        const email_verification_token = uuid.v4().replace(/\-/g, "")
        const userSchema = new UserSchema({ ...body, email_verification_token });
        await userSchema.save().then(async (result) => {
            logger.info(`${messageConstants.USER_REGISTERED}`);
            // create email Token and send email to user to verifiy email.
            const userId = result._id;
            const name = `${result.firstName} ${result.lastName}`;
            const link = `${process.env.BASE_URL}/verify-email?id=${userId}&token=${email_verification_token}`;
            const mailContent = {
                name,
                email: result.email,
                link: link
            }
            await mail.sendMailtoUser(mailTemplateConstants.VERIFY_EMAIL_TEMPLATE, result.email, mailSubjectConstants.VERIFY_EMAIL_SUBJECT, res, mailContent);
            return responseData.success(res, { id: result._id, email: result.email, role: result.role, name: `${result.firstName} ${result.lastName}` }, messageConstants.USER_REGISTERED);
        }).catch((err) => {
            if (err.code === 11000) {
                logger.error(`${messageConstants.USER_ALREADY_EXIST}. Plese use another email address`);
                return responseData.fail(res, `${messageConstants.USER_ALREADY_EXIST}. Plese use another email address`, 403);
            } else {
                logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
                return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
            }
        })
    })
}

const signIn = async (body, res) => {
    return new Promise(async () => {
        body['password'] = cryptoGraphy.encrypt(body.password);
        const user = await UserSchema.findOne({
            email: body.email
        });
        if (user) {
            if (!user.is_email_verified) {
                logger.error(messageConstants.USER_NOT_VERIFIED);
                return responseData.fail(res, messageConstants.USER_NOT_VERIFIED, 405);
            }
            if (user.password === body.password) {
                const token = await jsonWebToken.createToken(user);
                logger.info(`User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);
                return responseData.success(res, { id: user._id, token, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` }, `User ${messageConstants.LOGGEDIN_SUCCESSFULLY}`);


            } else {
                logger.error(messageConstants.EMAIL_PASS_INCORRECT);
                return responseData.fail(res, messageConstants.EMAIL_PASS_INCORRECT, 403);
            }
        } else {
            logger.error(messageConstants.EMAIL_NOT_FOUND);
            return responseData.fail(res, messageConstants.EMAIL_NOT_FOUND, 403);
        }
    }).catch((err) => {
        logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
        return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
    });
}

const verifyEmail = async (body, res) => {
    return new Promise(async () => {
        await UserSchema.findOne({
            _id: new mongoose.Types.ObjectId(body.id),
            email_verification_token: body.token
        }).then(async (result) => {
            if (result && result.is_email_verified === true) {
                logger.info(`${messageConstants.EMAIL_ALREADY_VERIFIED} for ${result.email}`);
                return responseData.success(res, {}, messageConstants.EMAIL_ALREADY_VERIFIED);
            } if (result && result.is_email_verified === false) {
                await UserSchema.findOneAndUpdate(
                    {
                        _id: new mongoose.Types.ObjectId(result._id)
                    },
                    {
                        is_email_verified: true
                    }).then(async (result) => {
                        if (result.length !== 0) {
                            logger.info(`${messageConstants.EMAIL_VERIFIED} for ${result.email}`);
                            return responseData.success(res, {}, messageConstants.EMAIL_VERIFIED);
                        } else {
                            logger.error(`${messageConstants.EMAIL_NOT_VERIFIED} for ${result.email}`);
                            return responseData.fail(res, messageConstants.EMAIL_NOT_VERIFIED, 403)
                        }
                    }).catch((err) => {
                        logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
                        return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
                    })
            } else {
                logger.error(messageConstants.EMAIL_VERIFY_INCORRECT);
                return responseData.fail(res, messageConstants.EMAIL_VERIFY_INCORRECT, 401);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}

// ==== Resend Email Verification ==== service
const resendEmailVerification = async (email) => {
    try {
        const user = await UserSchema.findOne({ email });

        // Check if the user exists
        if (!user) {
            throw new Error('User not found');
        }

        // Check if the user's email is already verified
        if (user.is_email_verified) {
            throw new Error('Email is already verified');
        }

        // Generate a temporary email verification token (valid for one use)
        const temporaryEmailVerificationToken = uuid.v4().replace(/\-/g, "");

        // Compose the email content with the temporary token included in the link
        const userId = user._id;
        const name = `${user.firstname} ${user.lastname}`;
        const link = `${process.env.BASE_URL}/verify-email?id=${userId}&token=${temporaryEmailVerificationToken}`;

        const mailContent = {
            name,
            email: user.email,
            link: link
        };

        // Send the verification email with the temporary token in the link
        await mail.sendMailtoUser(mailTemplateConstants.VERIFY_EMAIL_TEMPLATE, user.email, mailSubjectConstants.VERIFY_EMAIL_SUBJECT, mailContent);

        // Log and return a success message
        logger.info(`${messageConstants.EMAIL_RESENT_FOR_VERIFICATION} for ${user.email}`);
        return 'Email verification link resent successfully';
    } catch (error) {
        // Handle any errors and log them
        logger.error(`Resend Email Verification ${messageConstants.API_FAILED} ${error}`);
        throw new Error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${error}`);
    }
}

// ----resend email----


// ==== Reset Password ====
const resetPassword = async (body, userData, res) => {
    return new Promise(async () => {
        body['old_password'] = cryptoGraphy.encrypt(body.old_password);
        const user = await UserSchema.findOne({ _id: userData._id })
        if (body.old_password !== user.password) {
            logger.error(`${messageConstants.OLD_PASSWORD_NOT_MATCHED} with ${body.old_password}`);
            return responseData.fail(res, messageConstants.OLD_PASSWORD_NOT_MATCHED, 403)
        } else {
            body['new_password'] = cryptoGraphy.encrypt(body.new_password);
            await UserSchema.findOneAndUpdate(
                {
                    _id: user._id
                },
                {
                    password: body['new_password']
                }).then(async (result) => {
                    if (result.length !== 0) {
                        const mailContent = {
                            name: user.name,
                            email: user.email
                        }
                        await mail.sendMailtoUser(mailTemplateConstants.RESET_PASS_TEMPLATE, user.email, mailSubjectConstants.RESET_PASS_SUBJECT, res, mailContent);
                        logger.info(`${messageConstants.PASSWORD_RESET} for ${user.email}`);
                        return responseData.success(res, {}, messageConstants.PASSWORD_RESET);
                    } else {
                        logger.error(`${messageConstants.PASSWORD_NOT_RESET} for ${user.email}`);
                        return responseData.fail(res, messageConstants.PASSWORD_NOT_RESET, 403)
                    }
                })
        }

    })
}


const forgotPassword = async (req, res, next) => {
    return new Promise(async () => {
        const user = await UserSchema.findOne({ email: req.body.email });
        if (user) {
            if (user.token) {
                await jsonWebToken.validateToken(req, res, next, user.token);
            } else {
                await createJsonWebTokenForUser(user);
            }
            await forgotPasswordLink(res, user);
        } else {
            logger.error(messageConstants.USER_NOT_FOUND);
            return responseData.success(res, [], messageConstants.USER_NOT_FOUND)
        }
    })
}

const changePassword = async (body, user, res) => {
    return new Promise(async () => {
        body['new_password'] = cryptoGraphy.encrypt(body.new_password);
        await UserSchema.findOneAndUpdate(
            {
                _id: user._id
            },
            {
                password: body['new_password']
            }).then(async (result) => {
                if (result.length !== 0) {
                    const mailContent = {
                        name: user.name,
                        email: user.email
                    }
                    await mail.sendMailtoUser(mailTemplateConstants.FORGOTTED_PASS_TEMPLATE, user.email, mailSubjectConstants.FORGOTTED_PASS_SUBJECT, res, mailContent);
                    logger.info(`${messageConstants.PASSWORD_FORGOT} for ${user.email}`);
                    return responseData.success(res, {}, messageConstants.PASSWORD_FORGOT);
                } else {
                    logger.error(`${messageConstants.PASSWORD_NOT_FORGOT} for ${user.email}`);
                    return responseData.fail(res, messageConstants.PASSWORD_NOT_FORGOT, 403)
                }
            })
    })

}

const getUserList = async (res, userData) => {
    return new Promise(async () => {
        await UserSchema.find({
            _id: { $ne: userData._id },
        }, { _id: 1, name: 1, email: 1 }).then(async (result) => {
            if (result.length !== 0) {
                logger.info(`User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                return responseData.success(res, result, `User ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
            } else {
                logger.error(`User ${messageConstants.LIST_NOT_FOUND}`);
                return responseData.success(res, [], `User ${messageConstants.LIST_NOT_FOUND}`);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}

const getOptionsList = async (req, res) => {
    return new Promise(async () => {
        try {
            const strengths = await StrengthsSchema.find({});
            const reasons = await ReasonsSchema.find({ user_type: req.query.user_type });
            const feedbackOptions = await FeedbackOptionsSchema.find({});
            const result = {
                strengths: strengths,
                reasons: reasons,
                feedback_options: feedbackOptions
            }
            logger.info(messageConstants.OPTION_LIST_FETCHED_SUCCESSFULLY);
            return responseData.success(res, result, messageConstants.OPTION_LIST_FETCHED_SUCCESSFULLY);
        } catch (err) {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        }
    })
}

const userProfile = async (body, res) => {
    return new Promise(async () => {
        const profileSchema = new ProfileSchema(body);
        await UserSchema.find({
            _id: body.user_id
        }).then(async (result) => {
            if (result.length !== 0) {
                await ProfileSchema.find({
                    user_id: body.user_id
                }).then(async (result) => {
                    if (result.length !== 0) {
                        await ProfileSchema.findOneAndUpdate(
                            {
                                user_id: body.user_id
                            },
                            body, { new: true, upsert: true }
                        ).then(async (result) => {
                            if (result.length !== 0) {
                                logger.info(messageConstants.PROFILE_UPDATED_SUCCESSFULLY);
                                return responseData.success(res, result, messageConstants.PROFILE_UPDATED_SUCCESSFULLY);
                            } else {
                                logger.error(messageConstants.PROFILE_NOT_UPDATED);
                                return responseData.fail(res, messageConstants.PROFILE_NOT_UPDATED, 401);
                            }
                        }).catch((err) => {
                            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
                            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
                        })
                    }
                    else {
                        await profileSchema.save().then(async (result) => {
                            logger.info(messageConstants.PROFILE_SAVED_SUCCESSFULLY);
                            return responseData.success(res, result, messageConstants.PROFILE_SAVED_SUCCESSFULLY);
                        }).catch((err) => {
                            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
                            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
                        })
                    }
                })
            } else {
                logger.error(`${messageConstants.USER_NOT_FOUND} Please signup and then add profile details.`);
                return responseData.fail(res, `${messageConstants.USER_NOT_FOUND} Please signup and then add profile details.`, 401);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}

const uploadImage = async (req, res) => {


    return new Promise(async () => {
        // const profileImageURL = req.file ? req.file.path : undefined; // File path saved in 'req.file.path' 
        // const correctedURL = profileImageURL?.replace(/\\/g, '/');
        // const encodedURL = encodeURI(correctedURL);
        // const jsonData = {
        //     imageUrl: encodedURL
        // }

        const { filename, originalname, mimetype, size } = req.file;
        const body = { profile_image: filename };

        await ProfileSchema.findOneAndUpdate(
            {
                user_id: req.params['user_id']
            },
            body, { new: true, upsert: true }
        ).then(async (results) => {
            return responseData.success(res, results, 'Profile image updated successfully.');

        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })

    })
}

const getUserProfile = async (req, userData, res) => {
    // console.log(req.query.user_id)
    return new Promise(async () => {
        const query = [
            {
                $match: {
                    _id: req.query.user_id
                }
            },
            {
                $lookup: {
                    from: 'user_profiles',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'profile_details'
                }
            },
            {
                $lookup: {
                    from: 'payments',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'payment_details'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    profile_details: 1,
                    is_subscription: { $ne: ['$payment_details', []] }
                }
            }
        ]
        await UserSchema.aggregate(query).then(async (result) => {
            if (result.length !== 0) {
                logger.info(`User details ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                return responseData.success(res, result, `User details ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
            } else {
                logger.info(`User ${messageConstants.PROFILE_DETAILS_NOT_FOUND}`);
                return responseData.fail(res, `User ${messageConstants.PROFILE_DETAILS_NOT_FOUND}`, 200);
            }
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        })
    })
}

const createJsonWebTokenForUser = async (user) => {
    const token = await jsonWebToken.createToken(user);
    await UserSchema.updateOne({
        _id: user['_id']
    }, { $set: { token: user['token'] } });
}

const forgotPasswordLink = async (res, user) => {
    const userId = user._id;
    const userToken = user['token'];
    const link = `${process.env.BASE_URL}/password-reset?id=${userId}&token=${userToken}`;
    const mailContent = {
        name: user.name,
        email: user.email,
        link: link
    }
    await mail.sendMailtoUser(mailTemplateConstants.FORGOT_PASS_TEMPLATE, user.email, mailSubjectConstants.FORGOT_PASS_SUBJECT, res, mailContent);
    return responseData.success(res, {}, messageConstants.EMAIL_SENT_FORGOT_PASSWORD);
}

module.exports = {
    signUp,
    signIn,
    verifyEmail,
    userProfile,
    uploadImage,
    getUserList,
    getUserProfile,
    forgotPassword,
    changePassword,
    resetPassword,
    getOptionsList,
    resendEmailVerification
}
