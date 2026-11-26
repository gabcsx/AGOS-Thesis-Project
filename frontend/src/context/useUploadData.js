/*
 * Hook for the signed-in upload/account workspace.
 * Lives in its own module so UploadDataContext.jsx only exports a component
 * (react-refresh/only-export-components).
 */
import { useContext } from 'react'
import { UploadDataContext } from './uploadDataStore'

// Manage Users, Review Uploads, and the staff upload page read this.
export function useUploadData() {
  const context = useContext(UploadDataContext)
  if (!context) {
    throw new Error('useUploadData must be used within UploadDataProvider')
  }
  return context
}
