# 🍎 App Store Review Test Accounts Setup

## 📱 **Test Accounts for Apple App Store Review**

This document provides the test account information and setup instructions for your Event Discovery app's App Store review.

---

## 🔑 **Test Account Credentials**

### **Primary Test Account (Premium)**
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

## 🗄️ **Database Setup Instructions**

### **Option 1: Run the Setup Script (Recommended)**

When your database is running, execute:

```bash
# Navigate to backend directory
cd backend

# Run the setup script
node create-review-accounts.js
```

### **Option 2: Manual Database Setup**

If you prefer to manually create the accounts, use these SQL commands:

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

## 🧪 **Testing Instructions for Apple Review Team**

### **1. App Installation & Setup**
1. Install the Event Discovery app from the App Store
2. Launch the app
3. Grant location permissions when prompted
4. The app will show an interactive map with events

### **2. Testing Free Features (No Account Required)**
- ✅ **Map Navigation**: Pan and zoom the interactive map
- ✅ **Event Discovery**: Browse events on the map
- ✅ **Event Details**: Tap on events to view details
- ✅ **Location Services**: App uses device location to show nearby events
- ✅ **Basic Search**: Search for events by name or category

### **3. Testing User Authentication**
1. Tap the profile icon (bottom right)
2. Tap "Sign In" or "Create Account"
3. Use the test account credentials above
4. Verify successful login

### **4. Testing Premium Subscription Features**

#### **Using Premium Account (review@eventdiscovery.app)**
1. Sign in with the premium account
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

#### **Testing Subscription Management**
1. Tap profile icon → "Manage Subscription"
2. View current subscription status
3. Test "Restore Purchases" functionality
4. View subscription terms and conditions
5. Access contact support

#### **Testing Subscription Terms**
1. Tap profile icon → "Subscription Terms"
2. Review all subscription information:
   - Pricing details ($4.99/month, $39.99/year)
   - Auto-renewal information
   - Cancellation instructions
   - Payment terms
   - Free trial information
   - Legal links

### **5. Testing Free User Limitations**

#### **Using Free Account (review.free@eventdiscovery.app)**
1. Sign in with the free account
2. Test limitations:
   - ❌ **Limited Radius**: Only 10km search radius
   - ❌ **Basic Filtering**: Limited filter options
   - ❌ **Event Creation**: Limited to 3 events
   - ❌ **Event Editing**: Can only edit own events
   - ❌ **No Analytics**: No access to analytics
   - ❌ **No Custom Categories**: Standard categories only
   - ❌ **No Export**: Cannot export data
   - ❌ **Ads**: May see advertisements

### **6. Testing Subscription Purchase Flow**

#### **New User Subscription Test**
1. Create a new account or use demo account
2. Try to access premium features
3. App will prompt for subscription upgrade
4. Test the subscription purchase flow:
   - Select plan (Monthly/Yearly)
   - View pricing information
   - Complete purchase through Apple's system
   - Verify premium features unlock

---

## 📋 **App Store Review Checklist**

### **✅ Subscription Compliance**
- [ ] **Clear Pricing**: $4.99/month, $39.99/year clearly displayed
- [ ] **Auto-Renewal**: Clear explanation of auto-renewal process
- [ ] **Cancellation**: Easy cancellation process with clear instructions
- [ ] **Terms & Conditions**: Comprehensive subscription terms available
- [ ] **Receipt Validation**: Proper receipt validation implemented
- [ ] **Restore Purchases**: Functional restore mechanism
- [ ] **No Misleading Info**: All information is accurate and clear

### **✅ User Experience**
- [ ] **Easy Navigation**: Intuitive app navigation
- [ ] **Clear Feature Differences**: Free vs Premium features clearly distinguished
- [ ] **Upgrade Prompts**: Appropriate upgrade prompts for premium features
- [ ] **Subscription Management**: Easy access to subscription management
- [ ] **Support Access**: Clear contact information for support

### **✅ Technical Functionality**
- [ ] **App Launch**: App launches without crashes
- [ ] **Map Functionality**: Interactive map works properly
- [ ] **Event Discovery**: Event search and filtering works
- [ ] **User Authentication**: Login/signup works correctly
- [ ] **Subscription Features**: Premium features work as advertised
- [ ] **Receipt Validation**: Server-side validation works
- [ ] **Error Handling**: Proper error messages and handling

---

## 📞 **Support Information**

### **For Apple Review Team**
- **App Support Email**: support@eventdiscovery.app
- **Developer Contact**: [Your Contact Information]
- **App Store Connect**: [Your App Store Connect Info]

### **Test Account Support**
- **Primary Test Account**: review@eventdiscovery.app
- **Secondary Test Account**: review.free@eventdiscovery.app
- **Demo Account**: demo@eventdiscovery.app
- **All Passwords**: AppStoreReview2024! (except demo: demo123)

---

## 🚀 **App Store Review Notes**

### **Important Information for Reviewers**
1. **This is an iOS-only app** - No web version available
2. **Location permissions required** - App needs location access for optimal experience
3. **Subscription model** - Free with premium subscription upgrade
4. **Apple compliance** - All subscription requirements implemented
5. **Test accounts provided** - Use provided credentials for testing

### **Expected Behavior**
- App should launch without crashes
- Map should load and display events
- User authentication should work smoothly
- Subscription features should function properly
- All Apple compliance requirements should be met

### **Known Limitations**
- App requires internet connection
- Location services needed for full functionality
- Some features require user authentication
- Premium features require active subscription

---

## ✅ **Review Ready**

Your Event Discovery app is ready for App Store review with:
- ✅ Complete test accounts provided
- ✅ Clear testing instructions
- ✅ All Apple compliance requirements met
- ✅ Comprehensive feature documentation
- ✅ Support contact information

**The app is fully compliant with Apple's subscription guidelines and ready for review!** 🎉📱
