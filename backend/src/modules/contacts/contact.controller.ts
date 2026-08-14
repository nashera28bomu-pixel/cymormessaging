import { Request, Response } from "express";
import { ok, paginated } from "../../utils/apiResponse";
import * as contactService from "./contact.service";
import { createContactSchema, updateContactSchema, listContactsQuerySchema, importContactsSchema } from "./contact.validators";

export async function create(req: Request, res: Response) {
  const input = createContactSchema.parse(req.body);
  const contact = await contactService.createContact(req.organizationId!, req.userId!, input);
  return ok(res, contact, 201);
}

export async function list(req: Request, res: Response) {
  const query = listContactsQuerySchema.parse(req.query);
  const { items, nextCursor, hasMore } = await contactService.listContacts({ organizationId: req.organizationId!, ...query });
  return paginated(res, items, { nextCursor, hasMore, limit: query.limit });
}

export async function get(req: Request, res: Response) {
  const contact = await contactService.getContact(req.organizationId!, req.params.contactId);
  return ok(res, contact);
}

export async function update(req: Request, res: Response) {
  const input = updateContactSchema.parse(req.body);
  const contact = await contactService.updateContact(req.organizationId!, req.params.contactId, input);
  return ok(res, contact);
}

export async function remove(req: Request, res: Response) {
  await contactService.deleteContact(req.organizationId!, req.params.contactId, req.userId!);
  return ok(res, { deleted: true });
}

export async function bulkImport(req: Request, res: Response) {
  const input = importContactsSchema.parse(req.body);
  const result = await contactService.importContacts(req.organizationId!, req.userId!, input.contacts);
  return ok(res, result);
}

export async function bulkExport(req: Request, res: Response) {
  const contacts = await contactService.exportContacts(req.organizationId!);
  return ok(res, contacts);
}
