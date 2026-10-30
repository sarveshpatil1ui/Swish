// backend/src/services/platform-config.service.js
import PlatformConfig from '../models/PlatformConfig.js'
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

  return updated
}

/**
 * Updates feature flags
 */
export async function setFeatureFlags(features = {}) {
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
  return updated
}

/**
 * Updates global broadcast banner
 */
export async function setBroadcastBanner(broadcast = {}) {
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
  return updated
}

