import mongoose from 'mongoose'

const { Schema } = mongoose

// ── Message (embedded in Conversation) ────────────────────────────────────────
const MessageSchema = new Schema(
  {
    sender:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:    { type: String, required: true, trim: true, maxlength: 2000 },
    readBy:  [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

// Ensure exactly one conversation per pair
ConversationSchema.index({ participants: 1 })

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
