import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import * as controller from "./contact.controller";

export const contactsRouter = Router();

contactsRouter.use(authenticate, requireOrganization());

contactsRouter.get("/", controller.list);
contactsRouter.post("/", controller.create);
contactsRouter.post("/import", controller.bulkImport);
contactsRouter.get("/export", controller.bulkExport);
contactsRouter.get("/:contactId", controller.get);
contactsRouter.patch("/:contactId", controller.update);
contactsRouter.delete("/:contactId", controller.remove);
