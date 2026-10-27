import mongoose from 'mongoose'

const { Schema } = mongoose

// ── Story Reply Subschema ─────────────────────────────────────────────────────
const StoryReplySchema = new Schema(
  {
    storyId:       { type: Schema.Types.ObjectId, ref: 'Story', default: null },
    imageUrl:      { type: String, default: null },
    reaction:      { type: String, default: null },
    caption:       { type: String, default: null },
    storyAuthorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
)

// ── Post Share Subschema ──────────────────────────────────────────────────────
const PostShareSchema = new Schema(
  {
    postId:     { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    imageUrl:   { type: String, default: null },
    caption:    { type: String, default: null },
    authorName: { type: String, default: null },
  },
  { _id: false }
)

// ── Message Reply Subschema (WhatsApp style) ──────────────────────────────────
const ReplyToSchema = new Schema(
  {
    messageId:   { type: Schema.Types.ObjectId, default: null },
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    senderName:  { type: String, default: null },
    text:        { type: String, default: null },
  },
  { _id: false }
)

// ── Message (embedded in Conversation) ────────────────────────────────────────
const MessageSchema = new Schema(
  {
    sender:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:       { type: String, required: true, trim: true, maxlength: 2000 },
    readBy:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    storyReply: { type: StoryReplySchema, default: null },
    postShare:  { type: PostShareSchema, default: null },
    replyTo:    { type: ReplyToSchema, default: null },
  },
  { timestamps: true }
)

MessageSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

// ── Conversation ──────────────────────────────────────────────────────────────
const ConversationSchema = new Schema(
  {
    // Exactly 2 participants for DMs
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    messages:     [MessageSchema],
    lastMessage:  { type: String, default: '' },
    lastMessageAt:{ type: Date,   default: null },
    lastSender:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

// Ensure fast participant queries and ordered conversation list without in-memory sort
ConversationSchema.index({ participants: 1, lastMessageAt: -1 })

ConversationSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export const Message      = mongoose.model('Message',      MessageSchema)
export const Conversation = mongoose.model('Conversation', ConversationSchema)
