// backend/src/models/DisciplinaryWarning.js
// ─────────────────────────────────────────────────────────────────────────────
// Disciplinary Warning schema for College Admin module
//
// Tracks formal warnings issued to students/faculty for misconduct
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const DisciplinaryWarningSchema = new Schema(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    college: { type: String, required: true }, // Denormalized for easier filtering
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ['student', 'faculty'], required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedByName: { type: String, required: true },
    issuedByRole: { type: String, required: true },
    
    warningType: {
      type: String,
      enum: ['verbal', 'written', 'probation', 'suspension'],
      required: true
    },
    
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    
    category: {
      type: String,
      enum: ['academic_misconduct', 'behavioral', 'attendance', 'harassment', 'policy_violation', 'other'],
      required: true
    },
    
    description: { type: String, required: true, trim: true },
    
    incidentDate: { type: Date, required: true },
    incidentLocation: { type: String, default: null },
    
    witnesses: [{ type: String }], // Names of witnesses
    
    actionTaken: { type: String, default: null },
    
    status: {
      type: String,
      enum: ['active', 'resolved', 'appealed', 'expired'],
      default: 'active'
    },
    
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNotes: { type: String, default: null },
    
    expiresAt: { type: Date, default: null }, // Warnings can expire after a period
    
    attachments: [{
      url: { type: String, required: true },
      filename: { type: String, required: true },
      mimeType: { type: String, required: true },
      publicId: { type: String, required: true }
    }], // Evidence attachments
  },
  { timestamps: true }
)

DisciplinaryWarningSchema.index({ collegeId: 1, userId: 1, status: 1, createdAt: -1 })
DisciplinaryWarningSchema.index({ collegeId: 1, status: 1, severity: -1 })
DisciplinaryWarningSchema.index({ userId: 1, status: 1 })

// ── toJSON — expose id instead of _id ────────────────────────────────────────
DisciplinaryWarningSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('DisciplinaryWarning', DisciplinaryWarningSchema)
