const { responseData, messageConstants } = require("../../constants");
const UserSchema = require('../../models/users');
const ProfileSchema = require('../../models/profile');
const ClientProfileSchema = require('../../models/clientProfile');
const { logger } = require("../../utils");
const path = require('path');
const fs = require('fs');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const { uploadFile } = require("../../middleware/aws/aws.js");

const freelencerProfile = async (req, userData, res) => {
    return new Promise(async () => {
        let profile = await ProfileSchema.findOne({ user_id: req.userId });

        if (!profile) {
            profile = new ProfileSchema({ user_id: req.userId });
        }
        if (userData?.firstName && userData?.lastName && userData?.country) {
            profile.firstName = userData.firstName || "null";
            profile.lastName = userData.lastName || "null";
            profile.location = userData.country || "null"
        } else {
            // Handle the case where 'firstName' or 'lastName' is missing
            return responseData.fail(res, 'User is missing required information', 400);
        }
        if (req.body.experience) {
            const experienceData = req.body.experience;
            const company_name = experienceData?.company_name || "null";
            const position = experienceData?.position || "null";
            const job_description = experienceData?.job_description || "null";
            const job_location = experienceData?.job_location || "null";
            const start_date = experienceData?.start_date || "null";
            const end_date = experienceData?.end_date || "null";
            profile.experience.push({
                company_name,
                position,
                job_description,
                job_location,
                start_date,
                end_date
            });
        }

        if (req.body.education) {
            const educationData = req.body?.education;
            const degree_name = educationData?.degree_name || "null";
            const institution = educationData?.institution || "null";
            const start_date = educationData?.start_date || "null";
            const end_date = educationData?.end_date || "null";
            profile.education.push({
                degree_name,
                institution,
                start_date,
                end_date,
            });
        }
        // For Portfolio section
        if (req.body.portfolio || req.file) {
            let fileUrl = '';
            if (req.file) {
                const fileBuffer = req.file.path;
                const folder_name = 'portfolio';
                // Upload the file buffer to S3 and get its access URL
                fileUrl = await uploadFile(fileBuffer, req.file.originalname, req.file.mimetype, folder_name);
            }
            let attachements = fileUrl == '' ? 'null' : fileUrl;
            if (req.body.portfolio) {
                const portfolioData = req.body?.portfolio;
                const project_name = portfolioData.project_name || "null";
                const project_description = portfolioData.project_description || "null";
                const technologies = portfolioData.technologies || [];
                    // If the portfolio array is empty, push a new entry
                    profile.portfolio.push({
                        project_name,
                        project_description,
                        technologies,
                        attachements
                    });
            } else {
                project_name = "null";
                project_description = "null";
                technologies = [];
                profile.portfolio.push({
                    project_name,
                    project_description,
                    attachements
                });
            }
        }
        profile.skills = req.body && req.body.skills !== undefined ? req.body.skills : profile.skills;
        profile.categories = req.body && req.body.categories !== undefined ? req.body.categories : profile.categories;
        profile.professional_role = req.body?.professional_role ? req.body?.professional_role : (profile.professional_role !== 'null' ? profile.professional_role : 'null');
        profile.title = req.body?.title ? req.body?.title : (profile.title !== 'null' ? profile.title : 'null');
        profile.hourly_rate = req.body?.hourly_rate ? req.body?.hourly_rate : (profile.hourly_rate !== 'null' ? profile.hourly_rate : 'null');
        profile.description = req.body?.description ? req.body?.description : (profile.description !== 'null' ? profile.description : 'null');
        await profile.save().then((result) => {
            logger.info(`Freelencer Profile Details ${messageConstants.PROFILE_CREATED_SUCCESSFULLY}`);
            return responseData.success(res, result, `Freelencer Profile Details ${messageConstants.PROFILE_CREATED_SUCCESSFULLY}`);
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        });
    })
};

const clientProfile = async (req, userData, res) => {
    return new Promise(async () => {
        let profile = await ClientProfileSchema.findOne({ userId: new ObjectId(req.userId) });
        if (!profile) {
            profile = new ClientProfileSchema({ userId: req.userId });
        }
        profile.firstName = userData.firstName || "null";
        profile.lastName = userData.lastName || "null";
        profile.location = userData.country || "null"
        profile.businessName = req.body?.business_name || 'null';
        profile.briefDescription = req.body?.brief_description || 'null';
        await profile.save().then((result) => {
            logger.info(`Client Profile Details ${messageConstants.PROFILE_CREATED_SUCCESSFULLY}`);
            return responseData.success(res, result, `Client Profile Details ${messageConstants.PROFILE_CREATED_SUCCESSFULLY}`);
        }).catch((err) => {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
            return responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
        });
    })
}

const getUserProfile = async (userData, res) => {
    return new Promise(async () => {
        const userId = userData._id.toString();
        let profile;
        if(userData.role==2){
            profile = await ClientProfileSchema.findOne({ userId: userId });
        }else{
            profile = await ProfileSchema.findOne({ user_id: userId });
        }
        if (profile) {
            profile = profile.toObject();
            profile.role = userData.role;
            logger.info(`User details ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
            return responseData.success(res, profile, `User details ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
        } else {
            logger.info(`User ${messageConstants.PROFILE_DETAILS_NOT_FOUND}`);
            return responseData.fail(res, `User ${messageConstants.PROFILE_DETAILS_NOT_FOUND}`, 200);
        }
    })
}

const profileImageUpload = async (req, userData, res) => {
    try {
        let profile;
        if(userData.role==2){
            profile = await ClientProfileSchema.findOne({ userId: new ObjectId(req.userId) });
        }else{
            profile = await ProfileSchema.findOne({ user_id: new ObjectId(req.userId) });
        }
        if (!profile) {
            // Create a new profile if it doesn't exist
            profile = new profileSchema({ userId: req.userId });
        }
        if (req.file) {
            const fileBuffer = req.file.path;
            const folder_name = userData.role == 1 ? 'freelancers' : 'clients';
            // Assuming uploadFile is a function you've defined to handle file uploads
            const fileUrl = await uploadFile(fileBuffer, req.file.originalname, req.file.mimetype, folder_name);
            profile.profile_image = fileUrl || 'null';  // Use the URL or 'null' if the upload failed
        }
        const result = await profile.save();
        logger.info(`Profile Image ${messageConstants.PROFILE_IMAGE_UPLOADED}`);
        responseData.success(res, result, `Profile Image ${messageConstants.PROFILE_IMAGE_UPLOADED}`);
    } catch (err) {
        logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
        responseData.fail(res, `${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`, 500);
    }
};


const getProfileImage = async (req, res) => {
    const profile_image = req.params['profile_image'];
    try {
        const imagePath = path.join('./public/uploads', profile_image);

        console.log(imagePath)
        if (!fs.existsSync(imagePath)) {
            logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. File not exists`);
            return null;
        }
        return imagePath;
    } catch (err) {
        logger.error(`${messageConstants.INTERNAL_SERVER_ERROR}. ${err}`);
        return null;
    }
}

const editFreelencerProfile = async (req, userData, res) => {
    return new Promise(async () => {
        const find_profile = await ProfileSchema.findOne({ user_id : new ObjectId(userData._id)});
        if(find_profile){
            const updateObject = {};
            let update_condition = {};
            if(req.body?.experience){
                updateObject["experience.$.company_name"] = req.body?.experience?.company_name;
                updateObject["experience.$.position"] = req.body?.experience?.position;
                updateObject["experience.$.job_description"] = req.body?.experience?.job_description;
                updateObject["experience.$.job_location"] = req.body?.experience?.job_location;
                updateObject["experience.$.start_date"] = req.body?.experience?.start_date;
                updateObject["experience.$.end_date"] = req.body?.experience?.end_date;
                update_condition = {
                    _id: new ObjectId(find_profile._id),
                    "experience._id": new ObjectId(req.body?.experience?.experienceId)
                }
            }
            if(req.body?.education){
                updateObject["education.$.degree_name"] = req.body?.education?.degree_name;
                updateObject["education.$.institution"] = req.body?.education?.institution;
                updateObject["education.$.start_date"] = req.body?.education?.start_date;
                updateObject["education.$.end_date"] = req.body?.education?.end_date;
                update_condition = {
                    _id: new ObjectId(find_profile._id),
                    "education._id": new ObjectId(req.body?.education?.educationId)
                }
            }
            if(req.body?.portfolio || req.file){
                let fileUrl = '';
                if (req.file) {
                    const fileBuffer = req.file.path;
                    const folder_name = 'portfolio';
                    // Upload the file buffer to S3 and get its access URL
                    fileUrl = await uploadFile(fileBuffer, req.file.originalname, req.file.mimetype, folder_name);
                    updateObject["portfolio.$.attachements"] = fileUrl == '' ? 'null' : fileUrl;
                    update_condition = {
                        _id: new ObjectId(find_profile._id),
                        "portfolio._id": new ObjectId(req.body?.portfolioId)
                    }  
                }else{
                    updateObject["portfolio.$.project_name"] = req.body?.portfolio?.project_name;
                    updateObject["portfolio.$.project_description"] = req.body?.portfolio?.project_description;
                    updateObject["portfolio.$.technologies"] = req.body?.portfolio?.technologies; 
                    update_condition = {
                        _id: new ObjectId(find_profile._id),
                        "portfolio._id": new ObjectId(req.body?.portfolio?.portfolioId)
                    }     
                }          
            }
            if(req.body?.professional_role || req.body?.title || req.body?.hourly_rate || req.body?.description || req.body?.skills || req.body?.categories){
                updateObject.professional_role = req.body?.professional_role;
                updateObject.hourly_rate = req.body?.hourly_rate;
                updateObject.description = req.body?.description;
                updateObject.skills = req.body?.skills;
                updateObject.categories = req.body?.categories;
                update_condition = {
                    _id: new ObjectId(find_profile._id)
                }
            }
            // Update data in freelencer profile
            await ProfileSchema.updateOne(update_condition,
              {
                $set: updateObject
              }
            ).then(async (updateResult) => {
                if(updateResult?.modifiedCount==1){
                    logger.info(`Edit Freelencer profile ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                    return responseData.success(res, req.body, `Edit Freelencer profile ${messageConstants.LIST_FETCHED_SUCCESSFULLY}`);
                }else{
                    logger.info(`Edit Freelencer profile ${messageConstants.PROFILE_NOT_UPDATED}`);
                    return responseData.fail(res, `${messageConstants.PROFILE_NOT_UPDATED}`, 200);
                }
            })
        }else{
            logger.error(messageConstants.USER_NOT_FOUND);
            return responseData.fail(res, messageConstants.USER_NOT_FOUND, 403);
        }
    })
}

const editClientProfile = async (req, userData, res) => {
    return new Promise(async () => {
        const find_profile = await ProfileSchema.findOne({ user_id : new ObjectId(userData._id)});
        if(find_profile){
            const updateObject = {};
        }else{
            logger.error(messageConstants.USER_NOT_FOUND);
            return responseData.fail(res, messageConstants.USER_NOT_FOUND, 403);
        }
    })
}
const deleteExperience = async (req, userData, res) => {
    return new Promise(async () => {
        const find_profile = await ProfileSchema.findOne({ user_id : new ObjectId(userData._id)});
        if(find_profile){           
            await ProfileSchema.updateOne({ _id: new ObjectId(find_profile._id) },
                { $pull: { experience: { _id: new ObjectId(req.body.experienceId) } } }
            ).then(async (deleteResult) => {
                if(deleteResult?.modifiedCount==1){
                    logger.info(`Delete experience ${messageConstants.DELETED_SUCCESSFULLY}`);
                    return responseData.success(res, req.body, `Delete experience ${messageConstants.DELETED_SUCCESSFULLY}`);
                }else{
                    logger.info(`Experience delete ${messageConstants.NOT_UPDATED}`);
                    return responseData.fail(res, `${messageConstants.NOT_UPDATED}`, 400);
                }
            })
        }else{
            logger.error(messageConstants.USER_NOT_FOUND);
            return responseData.fail(res, messageConstants.USER_NOT_FOUND, 403);
        }
    })
}

const searchFreelencers = async (req, userData, res) => {
    return new Promise(async () => {
        if(userData.role==2){
            logger.info(`Search freelencers ${messageConstants.NOT_ALLOWED}`);
            return responseData.fail(res, `${messageConstants.NOT_ALLOWED}`, 404);
        }else{
            const { keywords } = req.body;
            await ProfileSchema.find({
                skills: { $in: keywords.map(keyword => new RegExp(keyword, 'i')) }
            }).then(async (result) => {
                if(result.length>0){
                    logger.info(`Search freelencers ${messageConstants.DATA_FOUND}`);
                    return responseData.success(res, result, `Search freelencers ${messageConstants.DATA_FOUND}`);
                }else{
                    logger.info(`Search freelencers ${messageConstants.NOT_UPDATED}`);
                    return responseData.fail(res, `${messageConstants.NOT_UPDATED}`, 404);
                }
            })
        }
    })
}

module.exports = {
    freelencerProfile,
    clientProfile,
    getUserProfile,
    profileImageUpload,
    getProfileImage,
    deleteExperience,
    searchFreelencers,
    editFreelencerProfile,
    editClientProfile,
    deleteExperience
}