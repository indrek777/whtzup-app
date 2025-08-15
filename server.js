import express from 'express'
import multer from 'multer'
import { promises as fs } from 'fs'
import path from 'path'
import cors from 'cors'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 7777

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// API endpoint to update the events JSON file
app.post('/api/update-events', upload.single('events'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const eventsData = req.file.buffer.toString()
    
    // Validate JSON
    let parsedEvents
    try {
      parsedEvents = JSON.parse(eventsData)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON data' })
    }

    // Ensure it's an array
    if (!Array.isArray(parsedEvents)) {
      return res.status(400).json({ error: 'Events data must be an array' })
    }

    // Write to the public/events-user.json file
    const filePath = path.join(__dirname, 'public', 'events-user.json')
    await fs.writeFile(filePath, JSON.stringify(parsedEvents, null, 2), 'utf8')

    console.log(`Updated events file with ${parsedEvents.length} events`)
    
    res.json({ 
      success: true, 
      message: `Successfully updated events file with ${parsedEvents.length} events`,
      eventCount: parsedEvents.length
    })

  } catch (error) {
    console.error('Error updating events file:', error)
    res.status(500).json({ error: 'Failed to update events file' })
  }
})

// API endpoint to get current events
app.get('/api/events', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'public', 'events-user.json')
    const data = await fs.readFile(filePath, 'utf8')
    const events = JSON.parse(data)
    res.json(events)
  } catch (error) {
    console.error('Error reading events file:', error)
    res.status(500).json({ error: 'Failed to read events file' })
  }
})

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Events API available at http://localhost:${PORT}/api/update-events`)
})
