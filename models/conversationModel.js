const mongoose = require("mongoose")
const messageModel = require("./messageModel")
const { appError } = require("../utils")

const conversationSchema = new mongoose.Schema(
    {
        userOne: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "please provide user one"],
        },
        userTwo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "please provide user two"],
        },
        /* isDeleteFromUserOne: {
            type: Boolean,
            default: false,
            select: false,
        },
        isDeleteFromUserTwo: {
            type: Boolean,
            default: false,
            select: false,
        },

        /*******************************************************************************************************************************/
        /* it helps us to implement the functionality that when a user deleted the conversation other user can still have the messages */
        /*******************************************************************************************************************************/

        deletedByUserOne: {
            isDeleted: {
                type: Boolean,
                default: false,
                select: false,
            },
            deletedAt: {
                type: Date,
                default: null,
                select: false,
            },
        },
        deletedByUserTwo: {
            isDeleted: {
                type: Boolean,
                default: false,
                select: false,
            },
            deletedAt: {
                type: Date,
                default: null,
                select: false,
            },
        },
    },
    {
        timestamps: true,
        virtuals: true,
    }
)

conversationSchema.virtual("lastMessage").get(async function () {
    console.log("Getting last message for conversation:", this._id)
    const message = await messageModel
        .findOne({ conversation: this._id })
        .sort({ _id: -1 })
    return message
})

conversationSchema.virtual("nbrOfUnreadMessages").get(async function () {
    const nbrOfUnreadMessage = await messageModel
        .find({ conversation: this._id, isSeen: false })
        .count()
    return nbrOfUnreadMessage
})

// delete conversation from user
conversationSchema.statics.getConversation = async function (
    conversationId,
    userId
) {
    console.log(conversationId, userId)
    const [conversationOne, conversationTwo] = await Promise.all([
        this.findOne({
            userOne: userId,
            _id: conversationId,
            "deletedByUserOne.isDeleted": false,
        }),
        this.findOne({
            userTwo: userId,
            _id: conversationId,
            "deletedByUserTwo.isDeleted": false,
        }),
    ])

    if (conversationOne) {
        return conversationOne
    }

    if (conversationTwo) {
        return conversationTwo
    }
    throw new appError("Conversation not found", 404)
}

// delete conversation from user
conversationSchema.statics.deleteConversation = async function (
    conversationId,
    userId
) {
    const [conversationOne, conversationTwo] = await Promise.all([
        this.findOne({
            userOne: userId,
            _id: conversationId,
        }).select("+deletedByUserOne"),
        this.findOne({
            userTwo: userId,
            _id: conversationId,
        }).select("+deletedByUserTwo"),
    ])

    if (conversationOne) {
        conversationOne.deletedByUserOne.isDeleted = true
        conversationOne.deletedByUserOne.deletedAt = Date.now()
        await conversationOne.save()
        return
    }

    if (conversationTwo) {
        conversationTwo.deletedByUserTwo.isDeleted = true
        conversationTwo.deletedByUserTwo.deletedAt = Date.now()
        await conversationTwo.save()
        return
    }
}

// create conversation
conversationSchema.statics.createConversation = async function ({
    userOne,
    userTwo,
}) {
    // the user who request to create new  conversation also his id  is userOne
    const [conversationOne, conversationTwo] = await Promise.all([
        this.findOne({ userOne, userTwo }).select("deletedByUserOne"),
        this.findOne({ userOne: userTwo, userTwo, userOne }).select(
            "deletedByUserTwo"
        ),
    ])

    if (conversationOne && conversationOne.deletedByUserOne.isDeleted == true) {
        conversationOne.deletedByUserOne.isDeleted = false
        await conversationOne.save()
        return
    }

    if (conversationTwo && conversationTwo.deletedByUserTwo.isDeleted == true) {
        conversationTwo.deletedByUserTwo.isDeleted = false
        await conversationTwo.save()
        return
    }

    return await conversationModel.create({ userOne, userTwo })
}

conversationSchema.pre("findOne", async function () {})

conversationSchema.index({ userOne: 1, userTwo: 1 }, { unique: true })

const conversationModel = mongoose.model("Conversation", conversationSchema)

module.exports = conversationModel
