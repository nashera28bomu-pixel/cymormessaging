import { Contact, normalizePhone } from "./contact.model";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../audit-logs/auditLog.model";

export async function createContact(organizationId: string, actorId: string, input: {
  name?: string; phone: string; email?: string; tags?: string[]; notes?: string; customFields?: Record<string, unknown>;
}) {
  const phone = normalizePhone(input.phone);
  const existing = await Contact.findOne({ organizationId, phone }).lean();
  if (existing) throw AppError.conflict("A contact with this phone number already exists", "DUPLICATE_CONTACT");

  const contact = await Contact.create({ organizationId, ...input, phone });
  await recordAuditLog({ organizationId, actorId, action: "CONTACT_CREATED", resource: "contact", resourceId: String(contact._id) });
  return contact;
}

export async function listContacts(params: { organizationId: string; search?: string; tag?: string; cursor?: string; limit: number }) {
  const filter: Record<string, unknown> = { organizationId: params.organizationId };
  if (params.tag) filter.tags = params.tag;
  if (params.search) filter.$or = [{ name: new RegExp(params.search, "i") }, { phone: new RegExp(params.search, "i") }, { email: new RegExp(params.search, "i") }];
  if (params.cursor) filter._id = { $lt: params.cursor };

  const items = await Contact.find(filter).sort({ _id: -1 }).limit(params.limit + 1).lean();
  const hasMore = items.length > params.limit;
  const page = hasMore ? items.slice(0, params.limit) : items;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;
  return { items: page, nextCursor, hasMore };
}

export async function getContact(organizationId: string, contactId: string) {
  const contact = await Contact.findOne({ _id: contactId, organizationId }).lean();
  if (!contact) throw AppError.notFound("Contact not found");
  return contact;
}

export async function updateContact(organizationId: string, contactId: string, updates: Record<string, unknown>) {
  if (updates.phone) updates.phone = normalizePhone(updates.phone as string);
  const contact = await Contact.findOneAndUpdate({ _id: contactId, organizationId }, { $set: updates }, { new: true });
  if (!contact) throw AppError.notFound("Contact not found");
  return contact;
}

export async function deleteContact(organizationId: string, contactId: string, actorId: string) {
  const contact = await Contact.findOneAndDelete({ _id: contactId, organizationId });
  if (!contact) throw AppError.notFound("Contact not found");
  await recordAuditLog({ organizationId, actorId, action: "CONTACT_DELETED", resource: "contact", resourceId: contactId });
  return contact;
}

export async function importContacts(organizationId: string, actorId: string, contacts: { name?: string; phone: string; email?: string; tags?: string[] }[]) {
  const ops = contacts.map((c) => ({
    updateOne: {
      filter: { organizationId, phone: normalizePhone(c.phone) },
      update: { $setOnInsert: { organizationId, phone: normalizePhone(c.phone) }, $set: { name: c.name, email: c.email, tags: c.tags ?? [] } },
      upsert: true,
    },
  }));
  const result = await Contact.bulkWrite(ops);
  await recordAuditLog({ organizationId, actorId, action: "CONTACTS_IMPORTED", resource: "contact", metadata: { count: contacts.length } });
  return { imported: contacts.length, upserted: result.upsertedCount, modified: result.modifiedCount };
}

export async function exportContacts(organizationId: string) {
  return Contact.find({ organizationId }).lean();
}
