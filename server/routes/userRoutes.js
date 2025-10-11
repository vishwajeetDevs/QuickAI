// import express from 'express'
// import { auth } from '../middlewares/auth.js';
// import { getPublishedCreations, getUserCreations, toggleLikeCreation } from '../controllers/userController.js';

// const userRouter = express.Router();

// userRouter.get("/get-user-creations", auth, getUserCreations)
// userRouter.get("/get-published-creations", auth, getPublishedCreations)
// userRouter.post("/toggle-like-creation", auth, toggleLikeCreation)

// export default userRouter;




import express from "express";
import { getPublishedCreations, getUserCreations, toggleLikeCreation } from "../controllers/userController.js";

const userRouter = express.Router();

// No auth here; Clerk's requireAuth() is applied in server.js
userRouter.get("/get-user-creations", getUserCreations);
userRouter.get("/get-published-creations", getPublishedCreations);
userRouter.post("/toggle-like-creation", toggleLikeCreation);

export default userRouter;
