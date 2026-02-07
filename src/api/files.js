// Use explicit env override when provided; otherwise use relative `/api` so the
// Create React App dev server proxy can route requests to the backend.
const API_BASE = process.env.REACT_APP_API_URL || '/api'

export const listFiles = async (path = '') => {
  try {
    const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`)
    }
    const data = await response.json()
    // Ensure we always return files and folders arrays
    return {
      files: data.files || [],
      folders: data.folders || []
    }
  } catch (error) {
    console.error('Error listing files:', error)
    return { files: [], folders: [] }
  }
}

export const uploadFiles = async (files, targetPath = '') => {
  try {
    const formData = new FormData()
    
    // If files is an array of objects with file and relativePath properties
    if (files[0] && files[0].file) {
      files.forEach(({ file, relativePath }) => {
        // For now, just add the file without relative path
        formData.append('files', file)
      })
    } else {
      // If files is just an array of File objects
      files.forEach(file => {
        formData.append('files', file)
      })
    }
    
    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error uploading files:', error)
    throw error
  }
}

export const deleteFile = async (filePath) => {
  try {
    const response = await fetch(`${API_BASE}/files?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

export const renameFile = async (oldPath, newName) => {
  try {
    const response = await fetch(`${API_BASE}/files/rename`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newName })
    })
    
    if (!response.ok) {
      throw new Error(`Rename failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error renaming file:', error)
    throw error
  }
}

export const createFolder = async ({ name, parentPath = '' }) => {
  try {
    const response = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentPath })
    })
    
    if (!response.ok) {
      throw new Error(`Create folder failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error creating folder:', error)
    throw error
  }
}

export const listTrash = async () => {
  try {
    const response = await fetch(`${API_BASE}/trash`, { credentials: 'include' })
    if (!response.ok) throw new Error(`List trash failed: ${response.status}`)
    return await response.json()
  } catch (err) {
    console.error('Error listing trash:', err)
    return { items: [] }
  }
}

export const restoreTrash = async (path) => {
  try {
    const response = await fetch(`${API_BASE}/trash/restore`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path })
    })
    if (!response.ok) throw new Error(`Restore failed: ${response.status}`)
    return await response.json()
  } catch (err) {
    console.error('Error restoring trash:', err)
    throw err
  }
}

export const deleteTrash = async (path) => {
  try {
    const response = await fetch(`${API_BASE}/trash?path=${encodeURIComponent(path)}`, { method: 'DELETE', credentials: 'include' })
    if (!response.ok) throw new Error(`Delete trash failed: ${response.status}`)
    return await response.json()
  } catch (err) {
    console.error('Error deleting trash:', err)
    throw err
  }
}

export const emptyTrash = async () => {
  try {
    const response = await fetch(`${API_BASE}/trash/empty`, { method: 'POST', credentials: 'include' })
    if (!response.ok) throw new Error(`Empty trash failed: ${response.status}`)
    return await response.json()
  } catch (err) {
    console.error('Error emptying trash:', err)
    throw err
  }
}

export const getTrashDownloadUrl = async (path) => {
  try {
    const response = await fetch(`${API_BASE}/trash/download?path=${encodeURIComponent(path)}`, { credentials: 'include' })
    if (!response.ok) throw new Error(`Get download url failed: ${response.status}`)
    const data = await response.json()
    return data.url || null
  } catch (err) {
    console.error('Error getting download url:', err)
    throw err
  }
}
