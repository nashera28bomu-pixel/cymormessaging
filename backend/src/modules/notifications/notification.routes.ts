import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import { ok } from "../../utils/apiResponse";
import { Notification } from "./notification.model";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate, requireOrganization());

notificationsRouter.get("/", async (req, res) => {
  const items = await Notification.find({ organizationId: req.organizationId }).sort({ createdAt: -1 }).limit(50).lean();
  return ok(res, items);
});

notificationsRouter.post("/:notificationId/read", async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, organizationId: req.organizationId },
    { $set: { isRead: true } },
    { new: true }
  );
  return ok(res, notification);
});
