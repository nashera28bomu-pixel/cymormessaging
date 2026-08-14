import { Router } from "express";
import * as authController from "./auth.controller";
import { authenticate } from "./authenticate";
import { authRateLimiter } from "../middleware/rateLimiters";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, authController.register);
authRouter.post("/login", authRateLimiter, authController.login);
authRouter.post("/refresh", authRateLimiter, authController.refresh);
authRouter.post("/verify-email", authController.verifyEmail);
authRouter.post("/forgot-password", authRateLimiter, authController.forgotPassword);
authRouter.post("/reset-password", authRateLimiter, authController.resetPassword);
authRouter.get("/me", authenticate, authController.me);
