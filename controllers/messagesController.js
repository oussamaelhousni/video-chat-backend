const { messageModel } = require("../models")
const { appError, catchAsync } = require("../utils")

// Route: POST /api/v1/conversations/:conversationId/messages
// Description: create new message in a conversation
// Access: Private
exports.createMessage = catchAsync(async (req, res, next) => {
    const io = req.app.get("io")
    const CONNECTED_USERS = req.app.get("CONNECTED_USERS")

    if (!req.params.conversationId)
        return next(new appError("Please provide conversation id", 400))

    const message = await messageModel.create({
        conversation: req.params.conversationId,
        ...req.body,
        sender: req.user._id,
    })

    // send message socket notification to receiver
    if (
        CONNECTED_USERS.get(req.body.receiver) &&
        CONNECTED_USERS.get(req.body.receiver).length > 0
    ) {
        CONNECTED_USERS.get(req.body.receiver)?.forEach((id) => {
            io.to(id).emit("message", message)
        })
    }

    return res.status(201).json({
        status: "success",
        data: { message },
    })
})

// Route: POST /api/v1/conversations/:conversationId/messages
// Description: create new message in a conversation
// Access: Private
exports.getMessages = catchAsync(async (req, res, next) => {
    return res.status(201).json({
        status: "success",
        data: await messageModel.getConversationMessages(
            req.params.conversationId,
            req.user._id
        ),
    })
})
