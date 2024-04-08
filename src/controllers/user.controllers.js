import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { Conversation } from '../models/conversation.model.js';
import nodemailer from 'nodemailer'

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens");
  }
}

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }
  try {
    // Verify Token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    // Find user in DB 
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, " Refresh token expired");
    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      )
  } catch (error) {
    throw new ApiError(error?.message || "Something went wrong");
  }


})

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  console.log(req.body)

  if (
    [fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  sendVerificationEmail(fullName, email, createdUser._id);

  return res.status(200).json(
    new ApiResponse(200, createdUser, "User created successfully")
  );
})

const loginUser = asyncHandler(async (req, res) => {
  const { password, email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist!!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password!!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findOne(user._id).select("-password -refreshToken");

  // Cookie will only be modifiable at backend not in the frontend
  const options = {
    httpOnly: false,
    secure: false
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        {
          User: loggedInUser, accessToken, refreshToken
        },
        "User Logged In Successfully!!"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      }
    },
    {
      new: true // return response mein updated value milegi
    }
  )

  // const options = {
  //   httpOnly: true,
  //   secure: true
  // }

  // return res
  //   .status(200)
  //   .clearCookie("accessToken", options)
  //   .clearCookie("refreshToken", options)
  //   .json(
  //     new ApiResponse(200, {}, "User logout Successfully!!")
  //   )
})

const getAllUserData = asyncHandler(async (req, res) => {
  const myId = req.user._id;
  const userData = await User.find({ _id: { $ne: myId } }).select('-password -refreshToken');
  return res.status(200).json(
    new ApiResponse(200, userData, 'Data fetched successfully')
  )
})

const getOneUserConversation = asyncHandler(async (req, res) => {
  console.log("GetOneUserConversation is called");
  const receiverId = req.params.friendId;
  const myId = req.user._id;
  
  const conversation = await Conversation.findOne({ participants: { $all: [myId, receiverId] } })
    .populate('messages')
    .exec();

  if (!conversation) {
    return res.status(200).json(new ApiResponse(200, [], 'These users have no chat history!!'));
  }

  let messages = conversation.messages;

  messages.sort((a, b) => {
    const createdAtA = new Date(a.createdAt).getTime();
    const createdAtB = new Date(b.createdAt).getTime();
    return createdAtA - createdAtB;
  });

  return res.status(200).json(
    new ApiResponse(200, messages, 'Chat history fetched successfully!!')
  );
});

const sendVerificationEmail = async (fullName, email, userId) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Verification email',

    // What even you want to send here
    html: '<p>Hii' + fullName + ', please click here to <a href="http://127.0.0.1:8000/api/v1/user/verify?id=' + userId + '"> Verify </a> your mail.</p>'
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new ApiError(400, 'Something went wrong while sending verification email');
  }
}

const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const verifiedUser = await User.updateOne({ _id: req.query.id }, { $set: { isVerified: true } });
    return res.status(200).json(
      new ApiResponse(200, verifiedUser, "User Verified Successfully")
    );
  } catch (error) {
    throw new ApiError(400, 'Failed to send verification email');
  }
})


export { registerUser, loginUser, logoutUser, refreshAccessToken,verifyEmail, getAllUserData, getOneUserConversation }
