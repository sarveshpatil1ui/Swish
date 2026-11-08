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
  follow_request: 'follows',
  follow_accept: 'follows',
}

export async function createNotification({ recipient, sender, type, post = null, notice = null, text, subtext = '', collegeId = null }) {
  let resolvedCollegeId = collegeId
  const preferenceKey = preferenceByType[type]

  const recipientUser = await User.findById(recipient).select('preferences collegeId').lean()
  if (!recipientUser) {
    return null
  }
  if (preferenceKey && recipientUser.preferences?.notifications?.[preferenceKey] === false) {
    return null
  }
  if (!resolvedCollegeId) {
    resolvedCollegeId = recipientUser.collegeId
  }

  const notification = await Notification.create({
    recipient,
    sender,
    type,
    post,
    notice,
    text,
    subtext,
    collegeId: resolvedCollegeId,
  })
  const populated = await notification.populate('sender', 'name username initials avatarColor profilePhoto role')
  emitToUser(recipient, 'notification:new', formatNotification(populated))
  return notification
}
