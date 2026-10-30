// backend/src/models/PlatformConfig.js
import mongoose from 'mongoose'

const { Schema } = mongoose

const PlatformConfigSchema = new Schema(
  {
    key: {
      type: String,
      default: 'global_config',
      unique: true,
      index: true,
    },
    maintenance: {
      enabled: {
        type: Boolean,
        default: false,
      },
      note: {
        type: String,
        default: 'Swish is currently undergoing scheduled platform maintenance. We will be back online shortly!',
        maxlength: 1000,
      },
      expectedBack: {
        type: String,
        default: '',
        maxlength: 200,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      updatedByName: {
        type: String,
        default: '',
      },
    },
    features: {
      allowRegistration: {
        type: Boolean,
        default: true,
      },
      allowPostCreation: {
        type: Boolean,
        default: true,
      },
      allowDirectMessaging: {
        type: Boolean,
        default: true,
      },
    },
    broadcast: {
      active: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: '',
        maxlength: 150,
      },
      message: {
        type: String,
        default: '',
        maxlength: 500,
      },
      type: {
        type: String,
        enum: ['info', 'warning', 'success', 'critical'],
        default: 'info',
      },
      link: {
        type: String,
        default: '',
      },
      dismissible: {
        type: Boolean,
        default: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
)

export default mongoose.models.PlatformConfig || mongoose.model('PlatformConfig', PlatformConfigSchema)

