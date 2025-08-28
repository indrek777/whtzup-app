// Add these endpoints to server.js before the SSL configuration

// Change password
app.post("/api/auth/change-password", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Current password and new password are required" });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "New password must be at least 6 characters long" });
  }
  
  if (user.password !== currentPassword) {
    return res.status(400).json({ success: false, error: "Current password is incorrect" });
  }
  
  user.password = newPassword;
  
  res.json({ success: true, message: "Password changed successfully" });
});

// Forgot password
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  
  res.json({ success: true, message: "Password reset email sent" });
});

// Request reset code
app.post("/api/auth/request-reset-code", (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  
  const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  res.json({ success: true, message: "Reset code sent to email", data: { resetCode } });
});

// Verify reset code
app.post("/api/auth/verify-reset-code", (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ success: false, error: "Email and code are required" });
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  
  const resetToken = `${user.email}_reset_token_${Date.now()}`;
  
  res.json({ success: true, message: "Code verified successfully", data: { resetToken } });
});

// Reset password with code
app.post("/api/auth/reset-password-with-code", (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  if (!resetToken || !newPassword) {
    return res.status(400).json({ success: false, error: "Reset token and new password are required" });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "New password must be at least 6 characters long" });
  }
  
  const email = resetToken.split('_')[0];
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(400).json({ success: false, error: "Invalid reset token" });
  }
  
  user.password = newPassword;
  
  res.json({ success: true, message: "Password reset successfully" });
});

// Subscription upgrade
app.post("/api/subscription/upgrade", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { plan } = req.body;
  
  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ success: false, error: "Valid plan (monthly/yearly) is required" });
  }
  
  user.subscription = {
    type: "premium",
    endDate: plan === 'monthly' ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };
  
  res.json({ success: true, message: "Subscription upgraded successfully", data: { subscription: user.subscription } });
});

// Subscription cancel
app.post("/api/subscription/cancel", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  if (user.subscription.type !== 'premium') {
    return res.status(400).json({ success: false, error: "No active subscription to cancel" });
  }
  
  user.subscription.cancelled = true;
  
  res.json({ success: true, message: "Subscription cancelled successfully", data: { subscription: user.subscription } });
});

// Subscription reactivate
app.post("/api/subscription/reactivate", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  if (user.subscription.type !== 'premium') {
    return res.status(400).json({ success: false, error: "No premium subscription to reactivate" });
  }
  
  user.subscription.cancelled = false;
  
  res.json({ success: true, message: "Subscription reactivated successfully", data: { subscription: user.subscription } });
});

// Subscription change plan
app.post("/api/subscription/change-plan", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { plan } = req.body;
  
  if (!plan || !['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ success: false, error: "Valid plan (monthly/yearly) is required" });
  }
  
  if (user.subscription.type !== 'premium') {
    return res.status(400).json({ success: false, error: "Premium subscription required" });
  }
  
  user.subscription.endDate = plan === 'monthly' ? 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  res.json({ success: true, message: "Plan changed successfully", data: { subscription: user.subscription } });
});

// Update events (sync)
app.post("/api/update-events", (req, res) => {
  const authHeader = req.headers.authorization;
  const user = getUserFromToken(authHeader);
  
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }
  
  const { events: newEvents } = req.body;
  
  if (!newEvents || !Array.isArray(newEvents)) {
    return res.status(400).json({ success: false, error: "Events array is required" });
  }
  
  let updatedCount = 0;
  let createdCount = 0;
  
  newEvents.forEach(newEvent => {
    const existingIndex = events.findIndex(e => e.id === newEvent.id);
    
    if (existingIndex !== -1) {
      events[existingIndex] = { ...events[existingIndex], ...newEvent, updatedAt: new Date().toISOString() };
      updatedCount++;
    } else {
      const eventToAdd = {
        ...newEvent,
        id: nextEventId++,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      events.push(eventToAdd);
      createdCount++;
    }
  });
  
  res.json({
    success: true,
    message: "Events updated successfully",
    data: { updated: updatedCount, created: createdCount, total: events.length }
  });
});
