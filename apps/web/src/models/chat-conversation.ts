import mongoose, { Schema, type InferSchemaType } from "mongoose";

const toolCallSchema = new Schema(
  {
    toolName: { type: String, required: true },
    args: { type: Schema.Types.Mixed },
    result: { type: String },
  },
  { _id: false }
);

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
    toolCalls: [toolCallSchema],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatConversationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "New conversation" },
    context: { type: Schema.Types.Mixed },
    messages: [messageSchema],
    lastMessageAt: { type: Date, index: true },
  },
  { timestamps: true }
);

chatConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export type IChatConversation = InferSchemaType<typeof chatConversationSchema>;

const ChatConversation =
  mongoose.models.ChatConversation ||
  mongoose.model("ChatConversation", chatConversationSchema);

export default ChatConversation;
