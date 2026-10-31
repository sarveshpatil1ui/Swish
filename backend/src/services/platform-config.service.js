// backend/src/services/platform-config.service.js
import PlatformConfig from '../models/PlatformConfig.js'
import AdminNotification from '../models/AdminNotification.js'
import { broadcastEvent, emitToAdmin } from './socket.service.js'

let _cachedConfig = null
let _cacheExpiresAt = 0
const CONFIG_CACHE_TTL_MS = 20_000 // 20 seconds in-process cache

/**
 * Retrieves the global platform configuration (with in-process TTL cache)
 */
export async function getPlatformConfig(forceFresh = false) {
  const now = Date.now()
  if (!forceFresh && _cachedConfig && _cacheExpiresAt > now) {
    return _cachedConfig
  }

  try {
    let config = await PlatformConfig.findOne({ key: 'global_config' }).lean()
    if (!config) {
      const created = await PlatformConfig.create({ key: 'global_config' })
      config = created.toObject()
    }

    const safeConfig = {
      ...config,
      maintenance: {
        enabled: false,
        note: 'Swish is currently undergoing scheduled platform maintenance. We will be back online shortly!',
        expectedBack: '',
        ...config?.maintenance,
      },
      features: {
        allowRegistration: true,
        allowPostCreation: true,
        allowDirectMessaging: true,
        ...config?.features,
      },
      broadcast: {
        active: false,
        title: '',
        message: '',
        type: 'info',
        link: '',
        dismissible: true,
        ...config?.broadcast,
      },
    }

    _cachedConfig = safeConfig
    _cacheExpiresAt = now + CONFIG_CACHE_TTL_MS
    return safeConfig
  } catch (err) {
    console.error('[PlatformConfigService] Failed to load config:', err)
    if (_cachedConfig) return _cachedConfig
    // Safe fallback defaults
    return {
      maintenance: { enabled: false, note: '', expectedBack: '' },
      features: { allowRegistration: true, allowPostCreation: true, allowDirectMessaging: true },
      broadcast: { active: false, title: '', message: '', type: 'info', dismissible: true },
    }
  }
}

/**
 * Fast synchronous check for middleware (uses cached state)
 */
export function isMaintenanceActiveSync() {
  return Boolean(_cachedConfig?.maintenance?.enabled)
}

/**
 * Updates maintenance mode settings
 */
export async function setMaintenanceMode({ enabled, note, expectedBack }, adminUser = null) {
  const updateData = {
    'maintenance.enabled': Boolean(enabled),
    'maintenance.updatedAt': new Date(),
  }
  if (typeof note === 'string') {
    updateData['maintenance.note'] = note.trim()
  }
  if (typeof expectedBack === 'string') {
    updateData['maintenance.expectedBack'] = expectedBack.trim()
  }
  if (adminUser) {
    updateData['maintenance.updatedBy'] = adminUser._id || adminUser.id
    updateData['maintenance.updatedByName'] = adminUser.name || 'Admin'
  }

  const updated = await PlatformConfig.findOneAndUpdate(
    { key: 'global_config' },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  _cachedConfig = updated
  _cacheExpiresAt = Date.now() + CONFIG_CACHE_TTL_MS

  // Broadcast to all connected clients in real time
  broadcastEvent('platform:config:update', updated)

  // Notify admin room
  emitToAdmin('admin:system:event', {
    type: 'maintenance_mode',
    enabled: Boolean(enabled),
    updatedByName: adminUser?.name || 'Admin',
    timestamp: new Date(),
  })

  // Create persistent AdminNotification for Main Admin Bell Popover
  try {
    const isMaintenanceOn = Boolean(enabled)
    const adminName = adminUser?.name || 'Admin'
    const notif = await AdminNotification.create({
      type: 'platform_control',
      title: isMaintenanceOn ? 'Platform Maintenance Activated' : 'Platform Maintenance Deactivated',
      message: isMaintenanceOn
        ? `Platform Maintenance Mode was activated by ${adminName}${note ? `: "${note}"` : ''}. Regular users are blocked.`
        : `Platform Maintenance Mode was deactivated by ${adminName}. Normal platform operations restored.`,
      data: {
        controlType: 'maintenance',
        enabled: isMaintenanceOn,
        note: note || '',
        expectedBack: expectedBack || '',
        updatedBy: adminName,
      },
      link: '/admin/platform-controls',
      priority: isMaintenanceOn ? 'urgent' : 'medium',
    })

    emitToAdmin('admin:notification:new', {
      ...notif.toObject(),
      id: notif._id.toString(),
    })
  } catch (notifErr) {
    console.error('[setMaintenanceMode] Failed to create AdminNotification:', notifErr)
  }

  return updated
}

/**
 * Updates feature flags
 */
export async function setFeatureFlags(features = {}, adminUser = null) {
  const updateData = {}
  if (typeof features.allowRegistration === 'boolean') {
    updateData['features.allowRegistration'] = features.allowRegistration
  }
  if (typeof features.allowPostCreation === 'boolean') {
    updateData['features.allowPostCreation'] = features.allowPostCreation
  }
  if (typeof features.allowDirectMessaging === 'boolean') {
    updateData['features.allowDirectMessaging'] = features.allowDirectMessaging
  }

  const updated = await PlatformConfig.findOneAndUpdate(
    { key: 'global_config' },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  _cachedConfig = updated
  _cacheExpiresAt = Date.now() + CONFIG_CACHE_TTL_MS

  broadcastEvent('platform:config:update', updated)

  // Create persistent AdminNotification for feature changes
  try {
    const adminName = adminUser?.name || 'Admin'
    const changes = []
    if (typeof features.allowRegistration === 'boolean') {
      changes.push(features.allowRegistration ? 'Student Registration RESUMED' : 'Student Registration PAUSED')
    }
    if (typeof features.allowPostCreation === 'boolean') {
      changes.push(features.allowPostCreation ? 'Post Creation RESUMED' : 'Post Creation PAUSED')
    }
    if (typeof features.allowDirectMessaging === 'boolean') {
      changes.push(features.allowDirectMessaging ? 'Direct Messaging RESUMED' : 'Direct Messaging PAUSED')
    }

    if (changes.length > 0) {
      const notif = await AdminNotification.create({
        type: 'platform_control',
        title: 'Platform Feature Controls Updated',
        message: `${changes.join(' • ')} (updated by ${adminName}).`,
        data: {
          controlType: 'features',
          features,
          updatedBy: adminName,
        },
        link: '/admin/platform-controls',
        priority: 'medium',
      })

      emitToAdmin('admin:notification:new', {
        ...notif.toObject(),
        id: notif._id.toString(),
      })
    }
  } catch (notifErr) {
    console.error('[setFeatureFlags] Failed to create AdminNotification:', notifErr)
  }

  return updated
}

/**
 * Updates global broadcast banner
 */
export async function setBroadcastBanner(broadcast = {}, adminUser = null) {
  const updateData = {
    'broadcast.updatedAt': new Date(),
  }
  if (typeof broadcast.active === 'boolean') updateData['broadcast.active'] = broadcast.active
  if (typeof broadcast.title === 'string') updateData['broadcast.title'] = broadcast.title.trim()
  if (typeof broadcast.message === 'string') updateData['broadcast.message'] = broadcast.message.trim()
  if (typeof broadcast.type === 'string') updateData['broadcast.type'] = broadcast.type
  if (typeof broadcast.link === 'string') updateData['broadcast.link'] = broadcast.link.trim()
  if (typeof broadcast.dismissible === 'boolean') updateData['broadcast.dismissible'] = broadcast.dismissible

  const updated = await PlatformConfig.findOneAndUpdate(
    { key: 'global_config' },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean()

  _cachedConfig = updated
  _cacheExpiresAt = Date.now() + CONFIG_CACHE_TTL_MS

  broadcastEvent('platform:config:update', updated)

  // Create persistent AdminNotification for global broadcast updates
  try {
    const adminName = adminUser?.name || 'Admin'
    const isActive = broadcast.active === true
    const bannerTitle = broadcast.title || broadcast.message || 'Global Announcement'

    const notif = await AdminNotification.create({
      type: 'platform_control',
      title: isActive ? 'Global Broadcast Banner Published' : 'Global Broadcast Deactivated',
      message: isActive
        ? `Broadcast banner is now live across all campuses: "${bannerTitle}" (by ${adminName}).`
        : `Global broadcast banner was taken down by ${adminName}.`,
      data: {
        controlType: 'broadcast',
        active: Boolean(isActive),
        bannerTitle,
        updatedBy: adminName,
      },
      link: '/admin/platform-controls',
      priority: isActive ? 'medium' : 'low',
    })

    emitToAdmin('admin:notification:new', {
      ...notif.toObject(),
      id: notif._id.toString(),
    })
  } catch (notifErr) {
    console.error('[setBroadcastBanner] Failed to create AdminNotification:', notifErr)
  }

  return updated
}