import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization, requireRole } from "../../auth/tenant";
import * as controller from "./apiKey.controller";

export const apiKeysRouter = Router();

apiKeysRouter.use(authenticate, requireOrganization(), requireRole("OWNER", "ADMIN", "DEVELOPER"));

apiKeysRouter.get("/", controller.list);
apiKeysRouter.post("/", controller.create);
apiKeysRouter.post("/:apiKeyId/revoke", controller.revoke);
apiKeysRouter.post("/:apiKeyId/rotate", controller.rotate);
