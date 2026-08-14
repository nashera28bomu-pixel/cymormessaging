import { Router } from "express";
import { authenticate } from "../../auth/authenticate";
import { requireOrganization } from "../../auth/tenant";
import * as controller from "./analytics.controller";
import { AuditLog } from "../audit-logs/auditLog.model";
import { ApiLog } from "./apiLog.model";
import { ok, paginated } from "../../utils/apiResponse";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate, requireOrganization());

analyticsRouter.get("/overview", controller.overview);
analyticsRouter.get("/usage", controller.usage);

export const auditLogsRouter = Router();
auditLogsRouter.use(authenticate, requireOrganization());
auditLogsRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = req.query.cursor as string | undefined;
  const filter: Record<string, unknown> = { organizationId: req.organizationId };
  if (cursor) filter._id = { $lt: cursor };
  const items = await AuditLog.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return paginated(res, page, { nextCursor: hasMore ? String(page[page.length - 1]._id) : null, hasMore, limit });
});

export const apiLogsRouter = Router();
apiLogsRouter.use(authenticate, requireOrganization());
apiLogsRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const items = await ApiLog.find({ organizationId: req.organizationId }).sort({ createdAt: -1 }).limit(limit).lean();
  return ok(res, items);
});
