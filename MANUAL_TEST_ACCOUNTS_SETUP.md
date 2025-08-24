# 🔧 Manual Test Account Setup

## 📱 **Test Account Setup for App Store Review**

Since the database isn't currently running, here's how to manually create the test accounts when your database is available.

---

## 🔑 **Test Account Credentials**

### **Primary Test Account (Premium Subscription)**
```
Email: review@eventdiscovery.app
Password: AppStoreReview2024!
Account Type: Premium Subscription (Active)
Features: All premium features enabled
```

### **Secondary Test Account (Free User)**
```
Email: review.free@eventdiscovery.app
Password: AppStoreReview2024!
Account Type: Free User
Features: Basic features only
```

### **Demo Account (Free User)**
```
Email: demo@eventdiscovery.app
Password: demo123
Account Type: Free User
Features: Basic features only
```

---

## 🗄️ **Manual Database Setup**

### **Option 1: Run the Automated Script**

When your database is running, execute:

```bash
# Navigate to backend directory
cd backend

# Run the setup script
node create-test-accounts-simple.js
```

### **Option 2: Manual SQL Commands**

If you prefer to manually create the accounts, use these SQL commands in your database:

#### **1. Create Premium Test Account**
```sql
-- Create user
INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
VALUES (
  'user_review_premium',
  'review@eventdiscovery.app',
  '$2b$10$hashed_password_here', -- Use bcrypt to hash 'AppStoreReview2024!'
  'App Store Review',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  true,
  true
);

-- Create premium subscription
INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
VALUES (
  'user_review_premium',
  'premium',
  'monthly',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  true,
  '["unlimited_events", "advanced_search", "priority_support", "analytics", "custom_categories", "export_data", "no_ads", "early_access", "extended_event_radius", "advanced_filtering", "premium_categories", "create_groups"]'
);
```

#### **2. Create Free Test Account**
```sql
-- Create user
INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
VALUES (
  'user_review_free',
  'review.free@eventdiscovery.app',
  '$2b$10$hashed_password_here', -- Use bcrypt to hash 'AppStoreReview2024!'
  'App Store Review Free',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  true,
  true
);

-- Create free subscription
INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
VALUES (
  'user_review_free',
  'free',
  NULL,
  NULL,
  NULL,
  false,
  '["basic_search", "basic_filtering", "view_events"]'
);
```

#### **3. Create Demo Account**
```sql
-- Create user
INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
VALUES (
  'user_demo',
  'demo@eventdiscovery.app',
  '$2b$10$hashed_password_here', -- Use bcrypt to hash 'demo123'
  'Demo User',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  true,
  true
);

-- Create free subscription
INSERT INTO user_subscriptions (user_id, status, plan, start_date, end_date, auto_renew, features)
VALUES (
  'user_demo',
  'free',
  NULL,
  NULL,
  NULL,
  false,
  '["basic_search", "basic_filtering", "view_events"]'
);
```

---

## 🔧 **Quick Setup Steps**

### **Step 1: Start Your Database**
```bash
# If using Docker
docker compose up -d

# Or start your database service manually
```

### **Step 2: Start Your Backend Server**
```bash
cd backend
npm start
```

### **Step 3: Create Test Accounts**
```bash
# Run the automated script
node create-test-accounts-simple.js

# Or manually execute the SQL commands above
```

### **Step 4: Test the Accounts**
1. Open your app in Expo Go
2. Try signing in with the test account credentials
3. Verify the accounts work correctly

---

## 🧪 **Testing Instructions**

### **Testing Free Features (No Account Required)**
- ✅ **Map Navigation**: Pan and zoom the interactive map
- ✅ **Event Discovery**: Browse events on the map
- ✅ **Event Details**: Tap on events to view details
- ✅ **Location Services**: App uses device location to show nearby events
- ✅ **Basic Search**: Search for events by name or category

### **Testing Premium Features (Using Premium Account)**
1. Sign in with: `review@eventdiscovery.app` / `AppStoreReview2024!`
2. Access premium features:
   - ✅ **Extended Radius**: Search events up to 500km away
   - ✅ **Advanced Filtering**: Multiple filter options
   - ✅ **Unlimited Events**: Create unlimited events
   - ✅ **Event Editing**: Edit any event in the system
   - ✅ **Priority Support**: Access to premium support
   - ✅ **Analytics**: View event analytics
   - ✅ **Custom Categories**: Create custom event categories
   - ✅ **Export Data**: Export event data
   - ✅ **Ad-Free Experience**: No advertisements
   - ✅ **Early Access**: Access to new features first

### **Testing Subscription Management**
1. Tap profile icon → "Manage Subscription"
2. View current subscription status
3. Test "Restore Purchases" functionality
4. View subscription terms and conditions
5. Access contact support

### **Testing Subscription Terms**
1. Tap profile icon → "Subscription Terms"
2. Review all subscription information:
   - Pricing details ($4.99/month, $39.99/year)
   - Auto-renewal information
   - Cancellation instructions
   - Payment terms
   - Free trial information
   - Legal links

---

## 📋 **Troubleshooting**

### **If Test Accounts Don't Work:**
1. **Check Database Connection**: Make sure your database is running
2. **Verify Backend Server**: Ensure the backend API is accessible
3. **Check Password Hashing**: Make sure passwords are properly hashed with bcrypt
4. **Database Schema**: Verify the users and user_subscriptions tables exist
5. **Network Issues**: Check if the app can connect to your backend

### **Common Issues:**
- **"Invalid email or password"**: Account doesn't exist or password is wrong
- **"Database connection failed"**: Database server is not running
- **"Backend API error"**: Backend server is not running or not accessible

---

## ✅ **Success Indicators**

### **When Test Accounts Work:**
- ✅ Can sign in with test account credentials
- ✅ Premium account shows premium features
- ✅ Free account shows limited features
- ✅ Subscription management works
- ✅ Subscription terms are accessible
- ✅ All Apple compliance features work

### **Ready for App Store Review:**
- ✅ Test accounts created and working
- ✅ All subscription features implemented
- ✅ Apple compliance requirements met
- ✅ Documentation complete
- ✅ App ready for submission

---

## 🎉 **Next Steps**

1. **Start your database and backend server**
2. **Create the test accounts using the script or manual SQL**
3. **Test the accounts in your app**
4. **Verify all subscription features work**
5. **Submit to App Store with test account credentials**

**Your Event Discovery app will be ready for App Store review once the test accounts are created!** 🚀📱
