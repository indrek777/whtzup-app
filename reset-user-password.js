const bcrypt = require('bcryptjs');

// Reset password for ints@me.com user
async function resetPassword() {
  try {
    const email = 'ints@me.com';
    const newPassword = 'test123';
    
    // Hash the new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 Resetting password for:', email);
    console.log('🔑 New password:', newPassword);
    console.log('🔒 Hashed password:', passwordHash);
    
    // Update the password in the database
    const { Client } = require('pg');
    
    const client = new Client({
      host: '165.22.90.180',
      port: 5432,
      database: 'whtzup_events',
      user: 'whtzup_user',
      password: 'whtzup_password'
    });
    
    await client.connect();
    
    const result = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name',
      [passwordHash, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Password updated successfully for user:', result.rows[0]);
    } else {
      console.log('❌ User not found:', email);
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

resetPassword();
