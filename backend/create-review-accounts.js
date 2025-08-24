#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration - Updated for Docker setup
const pool = new Pool({
  user: process.env.DB_USER || 'whtzup_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'whtzup_events',
  password: process.env.DB_PASSWORD || 'whtzup_password',
  port: process.env.DB_PORT || 5432,
});

// Test account data
const testAccounts = [
  {
    email: 'review@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review',
    accountType: 'premium',
    subscription: {
      status: 'premium',
      plan: 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      autoRenew: true,
      features: [
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
      ]
    }
  },
  {
    email: 'review.free@eventdiscovery.app',
    password: 'AppStoreReview2024!',
    name: 'App Store Review Free',
    accountType: 'free',
    subscription: {
      status: 'free',
      plan: null,
      startDate: null,
      endDate: null,
      autoRenew: false,
      features: ['basic_search', 'basic_filtering', 'view_events']
    }
  },
  {
    email: 'demo@eventdiscovery.app',
    password: 'demo123',
    name: 'Demo User',
    accountType: 'free',
    subscription: {
      status: 'free',
      plan: null,
      startDate: null,
      endDate: null,
      autoRenew: false,
      features: ['basic_search', 'basic_filtering', 'view_events']
    }
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
      
      try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [account.email]);
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠️  User already exists: ${account.email}`);
          console.log(`   User ID: ${existingUser.rows[0].id}`);
          console.log(`   Skipping creation...\n`);
          continue;
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(account.password, saltRounds);
        
        // Generate user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create user account
        const userResult = await pool.query(`
          INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, true)
          RETURNING id
        `, [userId, account.email, hashedPassword, account.name]);
        
        const userIdResult = userResult.rows[0].id;
        
        // Create or update subscription
        if (account.subscription.status === 'premium') {
          await pool.query(`
            INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            userIdResult,
            account.subscription.status,
            account.subscription.plan,
            account.subscription.startDate,
            account.subscription.endDate,
            account.subscription.autoRenew,
            JSON.stringify(account.subscription.features)
          ]);
        }
        
        // Create user preferences
        await pool.query(`
          INSERT INTO user_preferences (user_id, notifications, email_updates, default_radius, favorite_categories, language, theme)
          VALUES ($1, true, true, 10, '[]', 'en', 'auto')
        `, [userIdResult]);
        
        // Create user stats
        await pool.query(`
          INSERT INTO user_stats (user_id, events_created, events_attended, total_events)
          VALUES ($1, 0, 0, 0)
        `, [userIdResult]);
        
        console.log(`✅ Account created successfully: ${account.email}`);
        console.log(`   Type: ${account.accountType}`);
        console.log(`   Password: ${account.password}`);
        console.log(`   User ID: ${userIdResult}\n`);
        
      } catch (error) {
        console.error(`❌ Error creating account ${account.email}:`, error.message);
        console.log(`   Skipping this account...\n`);
      }
    }
    
    console.log('🎉 All test accounts created successfully!');
    console.log('\n📋 Test Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testAccounts.forEach(account => {
      console.log(`📧 ${account.email}`);
      console.log(`🔑 Password: ${account.password}`);
      console.log(`👤 Type: ${account.accountType.toUpperCase()}`);
      console.log(`⭐ Features: ${account.subscription.features.length} features`);
      console.log('');
    });
    
    console.log('📱 These accounts are ready for App Store review testing!');
    console.log('📄 See APP_STORE_REVIEW_ACCOUNT.md for detailed testing instructions.');
    
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the script
createTestAccounts().catch(console.error);
