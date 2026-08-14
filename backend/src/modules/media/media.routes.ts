import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import * as controller from "./media.controller";

export const mediaRouter = Router();

mediaRouter.use(authenticate, requireOrganization());

mediaRouter.get("/", controller.list);
mediaRouter.post("/", controller.uploadMiddleware.single("file"), controller.upload);
mediaRouter.delete("/:mediaId", controller.remove);
