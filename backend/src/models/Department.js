// backend/src/models/Department.js
// ─────────────────────────────────────────────────────────────────────────────
// Department schema for College Admin module
//
// Each department belongs to a specific college (collegeId)
// College Admin can only manage departments belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'

const { Schema } = mongoose

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    college: { type: String, required: true }, // Denormalized for easier filtering
    description: { type: String, default: '', maxlength: 500 },
    headOfDepartment: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// ── toJSON — expose id instead of _id ────────────────────────────────────────
DepartmentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  },
})

export default mongoose.model('Department', DepartmentSchema)
