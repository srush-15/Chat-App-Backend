import asyncHandler from "../utils/asyncHandler.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

const sendMessage = asyncHandler(async (req, res) => {
  console.log("SendMessage API Called");
  const senderId = req.user._id;
  const receiverId = req.params.id;

  const { message } = req.body;

  if (!senderId || !receiverId) {
    throw new ApiError(200, 'Invalid sender or receiver id provided');
  }

  const existingConversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
  const newMessage = await Message.create({ senderId, receiverId, message });

  if (!newMessage) {
    throw new ApiError(200, 'Failed to create message');
  }

  if (existingConversation) {
    existingConversation.messages.push(newMessage._id);
    await existingConversation.save();
  }
  else {
    const newConversation = await Conversation.create({ participants: [senderId, receiverId] });
    newConversation.messages.push(newMessage._id);
    await newConversation.save();
  }

  const receiversSocketId = getReceiverSocketId(receiverId);

  if (receiversSocketId) {  // if user is online
    io.to(receiversSocketId).emit('newMessage', newMessage);
  }

  return res.status(200).json(
    new ApiResponse(200, 'Message created successfully!!')
  )

})

// We have already written this controller in user.controller getOneUserConversation
const getMessage = asyncHandler(async (req, res) => {
  const friendId = req.params.friendId;
  const myId = req.user._id.toString();

  console.log(friendId, myId)

  const conversation = await Conversation.find({ participants: { $all: [myId, friendId] } }).populate('messages');

  if (!conversation) {
    return res.status(200).json(200, [], 'These user have no chat history!!');
  }

  return res.status(200).json(
    new ApiResponse(200, conversation, 'Chat history fetched successfully!!')
  )
})

export { sendMessage, getMessage };