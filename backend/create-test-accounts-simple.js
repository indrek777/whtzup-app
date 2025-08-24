#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration - adjust these values to match your setup
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'event_discovery',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Test account data
const testAccounts = [
  {
    email: 'review@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review',
    accountType: 'premium'
  },
  {
    email: 'review.free@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review Free',
    accountType: 'free'
  },
  {
    email: 'demo@eventdiscovery.app',
    password: 'demo123',
    name: 'Demo User',
    accountType: 'free'
  }
];

async function createTestAccounts() {
  console.log('🔧 Creating App Store Review Test Accounts...\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    for (const account of testAccounts) {
      console.log(`📝 Creating account: ${account.email}`);
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(account.password, saltRounds);
      
      // Generate user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        // Create user account
        const userResult = await pool.query(`
          INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, true)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP,
            is_active = true,
            email_verified = true
          RETURNING id
        `, [userId, account.email, hashedPassword, account.name]);
        
        const userIdResult = userResult.rows[0].id;
        
        // Create or update subscription for premium account
        if (account.accountType === 'premium') {
          await pool.query(`
            INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO UPDATE SET
              status = EXCLUDED.status,
              plan = EXCLUDED.plan,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              auto_renew = EXCLUDED.auto_renew,
              features = EXCLUDED.features,
              updated_at = CURRENT_TIMESTAMP
          `, [
            userIdResult,
            'premium',
            'monthly',
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            true,
            JSON.stringify([
              'unlimited_events',
              'advanced_search',
              'priority_support',
              'analytics',
              'custom_categories',
              'export_data',
              'no_ads',
              'early_access',
              'extended_event_radius',
              'advanced_filtering',
              'premium_categories',
              'create_groups'
            ])
          ]);
        }
        
        console.log(`✅ Account created successfully: ${account.email}`);
        console.log(`   Type: ${account.accountType}`);
        console.log(`   Password: ${account.password}`);
        console.log(`   User ID: ${userIdResult}\n`);
        
      } catch (error) {
        console.error(`❌ Error creating account ${account.email}:`, error.message);
      }
    }
    
    console.log('🎉 Test account creation completed!');
    console.log('\n📋 Test Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testAccounts.forEach(account => {
      console.log(`📧 ${account.email}`);
      console.log(`🔑 Password: ${account.password}`);
      console.log(`👤 Type: ${account.accountType.toUpperCase()}`);
      console.log('');
    });
    
    console.log('📱 These accounts are ready for testing!');
    console.log('📄 See APP_STORE_REVIEW_ACCOUNT.md for detailed testing instructions.');
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure your database is running');
    console.error('2. Check your database connection settings');
    console.error('3. Verify environment variables (DB_USER, DB_HOST, etc.)');
    console.error('4. Try running: docker compose up -d (if using Docker)');
  } finally {
    await pool.end();
  }
}

// Run the script
createTestAccounts().catch(console.error);
