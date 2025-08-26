import mongoose, { Schema, models, model } from "mongoose";

const RSVP = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    email: { type: String, required: true },
    name: { type: String },
    qty: { type: Number, default: 1 }, // supports quantities per RSVP
  },
  { timestamps: true }
);

export const RSVPModel = models.RSVP || model("RSVP", RSVP);
