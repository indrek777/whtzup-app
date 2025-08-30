import * as InAppPurchases from 'expo-in-app-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product IDs for subscriptions
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: 'premium_monthly',
  YEARLY: 'premium_yearly'
} as const;

export type SubscriptionProduct = typeof SUBSCRIPTION_PRODUCTS[keyof typeof SUBSCRIPTION_PRODUCTS];

// IAP Service for handling Apple In-App Purchases
class IAPService {
  private isConnected = false;
  private products: InAppPurchases.IAPItemDetails[] = [];

  // Initialize IAP connection
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 Initializing IAP connection...');
      
      // Connect to the store
      await InAppPurchases.connectAsync();
      this.isConnected = true;
      
      console.log('✅ IAP connected successfully');
      
      // Set up purchase listener
      InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('🛒 Purchase listener triggered:', { responseCode, results, errorCode });
        
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results.forEach(purchase => {
            if (!purchase.acknowledged) {
              this.handlePurchase(purchase);
            }
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('❌ Purchase cancelled by user');
        } else {
          console.error('❌ Purchase failed:', errorCode);
        }
      });

      // Set up purchase history listener
      InAppPurchases.setPurchaseHistoryListener(({ responseCode, results }) => {
        console.log('📜 Purchase history listener:', { responseCode, results });
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      return false;
    }
  }

  // Get available products
  async getProducts(): Promise<InAppPurchases.IAPItemDetails[]> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛍️ Fetching products...');
      const { responseCode, results } = await InAppPurchases.getProductsAsync([
        SUBSCRIPTION_PRODUCTS.MONTHLY,
        SUBSCRIPTION_PRODUCTS.YEARLY
      ]);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        this.products = results;
        console.log('✅ Products fetched:', results.map(p => ({ id: p.productId, price: p.price })));
        return results;
      } else {
        console.error('❌ Failed to fetch products:', responseCode);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return [];
    }
  }

  // Purchase a subscription
  async purchaseSubscription(productId: SubscriptionProduct): Promise<{
    success: boolean;
    error?: string;
    purchase?: InAppPurchases.InAppPurchase;
  }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🛒 Purchasing subscription:', productId);
      
      const { responseCode, results } = await InAppPurchases.purchaseItemAsync(productId);

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        const purchase = results[0];
        console.log('✅ Purchase successful:', purchase);
        
        // Acknowledge the purchase
        await InAppPurchases.finishTransactionAsync(purchase, true);
        
        return { success: true, purchase };
      } else {
        console.error('❌ Purchase failed:', responseCode);
        return { success: false, error: `Purchase failed: ${responseCode}` };
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Handle successful purchase
  private async handlePurchase(purchase: InAppPurchases.InAppPurchase) {
    try {
      console.log('🎉 Handling purchase:', purchase);
      
      // Acknowledge the purchase
      await InAppPurchases.finishTransactionAsync(purchase, true);
      
      // Store purchase receipt
      await this.storePurchaseReceipt(purchase);
      
      // Validate receipt with backend
      await this.validateReceiptWithBackend(purchase);
      
      // Update subscription status
      await this.updateSubscriptionStatus(purchase);
      
    } catch (error) {
      console.error('❌ Error handling purchase:', error);
    }
  }

  // Validate receipt with backend
  private async validateReceiptWithBackend(purchase: InAppPurchases.InAppPurchase | any) {
    try {
      console.log('🔍 Validating receipt with backend...');
      
      const receiptData = (purchase as any).transactionReceipt || '';
      const productId = purchase.productId;
      
      if (!receiptData) {
        console.warn('⚠️ No receipt data available for validation');
        return;
      }

      // Import API configuration
      const { getApiBaseUrl } = require('../config/api');
      const API_BASE_URL = getApiBaseUrl(true);

      // Get user token
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.error('❌ No user token available for receipt validation');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/subscription/validate-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          receiptData,
          productId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Receipt validation failed:', errorData);
        return;
      }

      const result = await response.json();
      console.log('✅ Receipt validated with backend:', result);
      
      // Update local subscription data with backend response
      if (result.subscription) {
        await AsyncStorage.setItem('user_subscription', JSON.stringify(result.subscription));
      }
      
    } catch (error) {
      console.error('❌ Error validating receipt with backend:', error);
    }
  }

  // Store purchase receipt locally
  private async storePurchaseReceipt(purchase: InAppPurchases.InAppPurchase) {
    try {
      const receipts = await this.getStoredReceipts();
      receipts.push({
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        purchaseDate: purchase.purchaseDate,
        receipt: purchase.transactionReceipt
      });
      
      await AsyncStorage.setItem('iap_receipts', JSON.stringify(receipts));
      console.log('💾 Receipt stored locally');
    } catch (error) {
      console.error('❌ Error storing receipt:', error);
    }
  }

  // Get stored receipts
  async getStoredReceipts(): Promise<Array<{
    productId: string;
    transactionId: string;
    purchaseDate: string;
    receipt: string;
  }>> {
    try {
      const receipts = await AsyncStorage.getItem('iap_receipts');
      return receipts ? JSON.parse(receipts) : [];
    } catch (error) {
      console.error('❌ Error getting stored receipts:', error);
      return [];
    }
  }

  // Update subscription status based on purchase
  private async updateSubscriptionStatus(purchase: InAppPurchases.InAppPurchase) {
    try {
      // Determine subscription plan
      const plan = purchase.productId === SUBSCRIPTION_PRODUCTS.MONTHLY ? 'monthly' : 'yearly';
      
      // Calculate end date
      const startDate = new Date();
      const endDate = new Date();
      
      if (plan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Update local subscription data
      const subscriptionData = {
        status: 'premium',
        plan,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
        ],
        transactionId: purchase.transactionId,
        purchaseDate: purchase.purchaseDate
      };

      // Store updated subscription
      await AsyncStorage.setItem('user_subscription', JSON.stringify(subscriptionData));
      console.log('✅ Subscription status updated locally');
      
    } catch (error) {
      console.error('❌ Error updating subscription status:', error);
    }
  }

  // Restore purchases (for existing subscribers)
  async restorePurchases(): Promise<{
    success: boolean;
    error?: string;
    restoredPurchases?: InAppPurchases.InAppPurchase[];
  }> {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log('🔄 Restoring purchases...');
      
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log('✅ Purchases restored:', results);
        
        // Process restored purchases
        for (const purchase of results) {
          await this.handlePurchase(purchase);
        }
        
        return { success: true, restoredPurchases: results };
      } else {
        console.error('❌ Failed to restore purchases:', responseCode);
        return { success: false, error: `Restore failed: ${responseCode}` };
      }
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Disconnect from IAP
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await InAppPurchases.disconnectAsync();
        this.isConnected = false;
        console.log('🔌 IAP disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting IAP:', error);
    }
  }

  // Get product details by ID
  getProductById(productId: string): InAppPurchases.IAPItemDetails | undefined {
    return this.products.find(product => product.productId === productId);
  }

  // Check if user has active subscription
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const subscriptionData = await AsyncStorage.getItem('user_subscription');
      if (!subscriptionData) return false;

      const subscription = JSON.parse(subscriptionData);
      
      if (subscription.status !== 'premium') return false;
      
      if (subscription.endDate) {
        const endDate = new Date(subscription.endDate);
        const now = new Date();
        return endDate > now;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const iapService = new IAPService();
