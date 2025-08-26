// src/models/Event.ts
import { Schema, model, models, Types, Document } from "mongoose";

export interface IEvent extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;                // reference to User
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;                          // Date in DB
  slug?: string;                           // unique public identifier (optional)
  customFields?: Record<string, unknown>;
  capacity: number;                        // total slots available
  bookedSlots: number;                     // running count of booked slots
  views: number;                           // analytics counter
  assigned_to?: Types.ObjectId | null;     // staff userId or null
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String },

    // ✅ use Date, not String
    startsAt: { type: Date, required: true, index: true },

    // optional, but if you use it as a public identifier, make it unique+sparse
    slug: { type: String, unique: true, sparse: true },

    customFields: { type: Schema.Types.Mixed, default: undefined },

    capacity: { type: Number, required: true, min: 0 },
    bookedSlots: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },

    // ✅ ensure this exists so assignment persists
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);
EventSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Safety: bookedSlots must not exceed capacity
EventSchema.pre("validate", function (next) {
  if (this.bookedSlots > this.capacity) {
    this.invalidate("bookedSlots", "bookedSlots cannot exceed capacity");
  }
  next();
});

// Nice JSON: id instead of _id; hide __v
EventSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret: any) => {
    if (ret && ret._id) {
      ret.id = ret._id.toString?.();
      delete ret._id;
    }
    return ret;
  },
});

const Event = models.Event || model<IEvent>("Event", EventSchema);
export default Event;
