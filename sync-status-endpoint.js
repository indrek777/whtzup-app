
// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    const deviceIdHeader = req.headers['x-device-id'];
    const currentDeviceId = deviceId || deviceIdHeader;

    // Get queue status
    const queueQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN processed = false THEN 1 END) as pending,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors
      FROM offline_queue 
      WHERE device_id = $1
    `;

    const queueResult = await pool.query(queueQuery, [currentDeviceId]);
    const queueStatus = queueResult.rows[0];

    // Get last sync time
    const lastSyncQuery = `
      SELECT MAX(updated_at) as last_sync
      FROM events 
      WHERE updated_at > (SELECT MAX(timestamp) FROM sync_log WHERE device_id = $1)
    `;

    const lastSyncResult = await pool.query(lastSyncQuery, [currentDeviceId]);
    const lastSync = lastSyncResult.rows[0]?.last_sync;

    res.json({
      success: true,
      deviceId: currentDeviceId,
      queue: {
        total: parseInt(queueStatus.total),
        processed: parseInt(queueStatus.processed),
        pending: parseInt(queueStatus.pending),
        errors: parseInt(queueStatus.errors)
      },
      lastSync: lastSync,
      isOnline: true
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sync status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
