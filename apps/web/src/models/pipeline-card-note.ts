import mongoose, { Schema } from "mongoose";

import type { InferSchemaType } from "mongoose";

const pipelineCardNoteSchema = new Schema(
  {
    cardId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "PipelineCard",
      index: true,
    },
    userId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

pipelineCardNoteSchema.index({ cardId: 1, createdAt: -1 });

export type IPipelineCardNote = InferSchemaType<typeof pipelineCardNoteSchema>;

if (mongoose.models.PipelineCardNote) {
  mongoose.deleteModel("PipelineCardNote");
}

const PipelineCardNote = mongoose.model(
  "PipelineCardNote",
  pipelineCardNoteSchema
);

export default PipelineCardNote;
