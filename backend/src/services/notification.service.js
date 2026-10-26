import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { emitToUser } from './socket.service.js'
import { formatNotification } from '../routes/notifications.routes.js'

const preferenceByType = {
  like: 'likes',
  comment: 'comments',
  follow: 'follows',
  mention: 'mentions',
  event: 'events',
}

export async function createNotification({ recipient, sender, type, post = null, notice = null, text, subtext = '' }) {
  const preferenceKey = preferenceByType[type]
  if (preferenceKey) {
    const recipientUser = await User.findById(recipient).select('preferences').lean()
    if (!recipientUser || recipientUser.preferences?.notifications?.[preferenceKey] === false) {
      return null
    }
  }

  const notification = await Notification.create({ recipient, sender, type, post, notice, text, subtext })
  const populated = await notification.populate('sender', 'name username initials avatarColor profilePhoto')
  emitToUser(recipient, 'notification:new', formatNotification(populated))
  return notification
}
