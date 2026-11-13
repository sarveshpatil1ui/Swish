import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Camera, Loader2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { resolveImageUrl } from '../../utils/posts'

const MAX_BIO_LENGTH = 300

const STUDENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Masters / PhD']
const DESIGNATIONS = ['HOD', 'Professor', 'Assistant Professor', 'Lecturer', 'Other']

export default function EditProfileModal({ onClose, onSaved }) {
  const { currentUser, saveProfile, uploadProfilePhoto } = useSwish()

  const [name, setName]               = useState(currentUser?.name ?? '')
  const [bio, setBio]                 = useState(currentUser?.bio ?? '')
  const [year, setYear]               = useState(currentUser?.year ?? '')
  const [designation, setDesignation] = useState(currentUser?.designation ?? '')
  const [photoPreview, setPhotoPreview] = useState(currentUser?.profilePhoto ?? null)
  const [photoFile, setPhotoFile]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef(null)

  const handlePhotoChange = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name cannot be empty.')
      return
    }
    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`)
      return
    }

    setSaving(true)
    setError('')

    // Upload photo first (if changed), then save name/bio/academic fields.
    if (photoFile) {
      setUploadingPhoto(true)
      const photoRes = await uploadProfilePhoto(photoFile)
      setUploadingPhoto(false)
      if (!photoRes.ok) {
        setSaving(false)
        setError(photoRes.error || 'Failed to upload photo.')
        return
      }
    }

    const res = await saveProfile(currentUser.id, {
      name: name.trim(),
      bio: bio.trim(),
      username: currentUser.username,
      ...(currentUser?.role === 'student' ? { year } : {}),
      ...(currentUser?.role === 'faculty' ? { designation } : {}),
    })
    setSaving(false)

    if (!res.ok) {
      setError(res.error || 'Failed to save profile.')
      return
    }

    onSaved?.()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-label="Edit profile"
      >
        <div className="w-full max-w-md bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-lg">
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-base-400 dark:text-base-500 hover:bg-base-100 dark:hover:bg-base-800 hover:text-base-700 dark:hover:text-base-300 transition-all"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5">
            {/* Photo */}
            <div className="flex justify-center mb-5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-20 h-20 rounded-full group"
                aria-label="Change profile photo"
              >
                {photoPreview ? (
                  <img
                    src={resolveImageUrl(photoPreview)}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: currentUser?.avatarColor || '#5B5FEF' }}
                  >
                    {currentUser?.initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  {uploadingPhoto ? (
                    <Loader2 size={18} className="text-white animate-spin" />
                  ) : (
                    <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handlePhotoChange(e.target.files[0])}
                  aria-label="Choose profile photo"
                />
              </button>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-base-600 dark:text-base-400 text-xs font-semibold mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                aria-label="Name"
              />
            </div>

            {/* Academic Year (Student) */}
            {currentUser?.role === 'student' && (
              <div className="mb-4">
                <label className="block text-base-600 dark:text-base-400 text-xs font-semibold mb-1.5">Academic Year</label>
                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 cursor-pointer"
                  aria-label="Academic Year"
                >
                  <option value="">Select Year</option>
                  {STUDENT_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Designation (Faculty) */}
            {currentUser?.role === 'faculty' && (
              <div className="mb-4">
                <label className="block text-base-600 dark:text-base-400 text-xs font-semibold mb-1.5">Designation</label>
                <select
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 cursor-pointer"
                  aria-label="Designation"
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Bio */}
            <div className="mb-2">
              <label className="block text-base-600 dark:text-base-400 text-xs font-semibold mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell people a bit about yourself…"
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 resize-none transition-all"
                aria-label="Bio"
              />
              <p className={`text-xs text-right mt-1 transition-colors ${
                bio.length > MAX_BIO_LENGTH ? 'text-rose-500 font-semibold' : 'text-base-400 dark:text-base-500'
              }`}>
                {bio.length}/{MAX_BIO_LENGTH}
              </p>
            </div>

            {error && (
              <p className="text-rose-500 text-xs mb-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold text-base-600 dark:text-base-400 border border-base-200 dark:border-base-700 rounded-xl hover:bg-base-50 dark:hover:bg-base-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-accent-500 rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  )
}
