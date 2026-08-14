import { Schema, model, Document, Types } from "mongoose";

export interface IRawMetaEvent extends Document {
  _id: Types.ObjectId;
  dedupeKey: string; // Meta message id, status id, or a hash of the entry - guarantees no double-processing
  payload: Record<string, unknown>;
  processed: boolean;
  processingError?: string;
  createdAt: Date;
}

const rawMetaEventSchema = new Schema<IRawMetaEvent>(
  {
    dedupeKey: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
    processingError: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const RawMetaEvent = model<IRawMetaEvent>("RawMetaEvent", rawMetaEventSchema);
