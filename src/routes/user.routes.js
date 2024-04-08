import { Router } from "express";
import { loginUser, registerUser, logoutUser, getAllUserData, getOneUserConversation, verifyEmail } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getMessage, sendMessage } from "../controllers/message.controllers.js";

const router = Router();
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/verify').post(verifyEmail)
//Secured routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/sendMessage/:id').post(verifyJWT, sendMessage);
router.route('/getAllUserData').post(verifyJWT, getAllUserData);
router.route('/getMessage/:friendId').post(verifyJWT, getMessage);
router.route('/getOneUserConversation/:friendId').post(verifyJWT, getOneUserConversation);

export default router;