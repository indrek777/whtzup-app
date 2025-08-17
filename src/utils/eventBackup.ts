import { Event } from '../context/EventContext'

// Function to create a backup of current events
export const createEventBackup = (events: Event[]): void => {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      eventCount: events.length,
      events: events
    }
    
    const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const backupUrl = URL.createObjectURL(backupBlob)
    
    const link = document.createElement('a')
    link.href = backupUrl
    link.download = `events-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(backupUrl)
  } catch (error) {
    console.error('Error creating backup:', error)
  }
}

// Function to restore events from backup
export const restoreFromBackup = async (file: File): Promise<Event[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string)
        if (backupData.events && Array.isArray(backupData.events)) {
          resolve(backupData.events)
        } else {
          reject(new Error('Invalid backup file format'))
        }
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read backup file'))
    reader.readAsText(file)
  })
}
