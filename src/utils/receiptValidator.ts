import axios from 'axios';

// Apple App Store receipt validation endpoints
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';

interface ReceiptValidationResponse {
  status: number;
  environment: string;
  receipt: {
    in_app: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date: string;
      purchase_date_ms: string;
      purchase_date_pst: string;
      original_purchase_date: string;
      original_purchase_date_ms: string;
      original_purchase_date_pst: string;
      expires_date?: string;
      expires_date_ms?: string;
      expires_date_pst?: string;
      web_order_line_item_id?: string;
      is_trial_period?: string;
      is_in_intro_offer_period?: string;
      subscription_group_identifier?: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date: string;
    purchase_date_ms: string;
    expires_date?: string;
    expires_date_ms?: string;
    is_trial_period?: string;
    is_in_intro_offer_period?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_product_id: string;
    auto_renew_status: string;
    expiration_intent: string;
    original_transaction_id: string;
    is_in_billing_retry_period: string;
    product_id: string;
    price_increase_status: string;
  }>;
}

interface ValidationResult {
  success: boolean;
  isValid: boolean;
  isExpired: boolean;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: Date;
  expirationDate?: Date;
  isTrialPeriod: boolean;
  isIntroOfferPeriod: boolean;
  autoRenewStatus: boolean;
  environment: string;
  error?: string;
}

class ReceiptValidator {
  private appBundleId: string;
  private appVersion: string;
  private sharedSecret?: string;

  constructor(bundleId: string, version: string, sharedSecret?: string) {
    this.appBundleId = bundleId;
    this.appVersion = version;
    this.sharedSecret = sharedSecret;
  }

  /**
   * Validate a receipt with Apple's servers
   */
  async validateReceipt(receiptData: string): Promise<ValidationResult> {
    try {
      console.log('🔍 Validating receipt with Apple...');

      // Try production first, then sandbox if needed
      const productionResult = await this.validateWithApple(receiptData, APPLE_PRODUCTION_URL);
      
      // Allow status inspection when returned shape varies
      if ((productionResult as any)?.status === 21007) {
        // Sandbox receipt sent to production, try sandbox
        console.log('🔄 Retrying with sandbox environment...');
        return await this.validateWithApple(receiptData, APPLE_SANDBOX_URL);
      }

      return productionResult;
    } catch (error) {
      console.error('❌ Receipt validation error:', error);
      return {
        success: false,
        isValid: false,
        isExpired: false,
        productId: '',
        transactionId: '',
        originalTransactionId: '',
        purchaseDate: new Date(),
        isTrialPeriod: false,
        isIntroOfferPeriod: false,
        autoRenewStatus: false,
        environment: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate receipt with a specific Apple endpoint
   */
  private async validateWithApple(receiptData: string, url: string): Promise<ValidationResult> {
    const requestBody: any = {
      'receipt-data': receiptData,
      'password': this.sharedSecret,
      'exclude-old-transactions': true
    };

    const response = await axios.post<ReceiptValidationResponse>(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const data = response.data;
    console.log('📊 Apple validation response status:', data.status);

    // Handle different status codes
    switch (data.status) {
      case 0:
        return this.processValidReceipt(data);
      case 21000:
        throw new Error('The App Store could not read the JSON object you provided.');
      case 21002:
        throw new Error('The data in the receipt-data property was malformed.');
      case 21003:
        throw new Error('The receipt could not be authenticated.');
      case 21004:
        throw new Error('The shared secret you provided does not match the shared secret on file for your account.');
      case 21005:
        throw new Error('The receipt server is not currently available.');
      case 21006:
        throw new Error('This receipt is valid but the subscription has expired.');
      case 21007:
        throw new Error('This receipt is from the test environment, but it was sent to the production environment for verification.');
      case 21008:
        throw new Error('This receipt is from the production environment, but it was sent to the test environment for verification.');
      case 21010:
        throw new Error('This receipt could not be authorized.');
      case 21099:
        throw new Error('Internal data access error.');
      default:
        throw new Error(`Unknown status code: ${data.status}`);
    }
  }

  /**
   * Process a valid receipt response
   */
  private processValidReceipt(data: ReceiptValidationResponse): ValidationResult {
    const environment = data.environment;
    const inAppPurchases = data.receipt.in_app || [];
    const latestReceiptInfo = data.latest_receipt_info || [];
    const pendingRenewalInfo = data.pending_renewal_info || [];

    if (inAppPurchases.length === 0 && latestReceiptInfo.length === 0) {
      return {
        success: true,
        isValid: false,
        isExpired: false,
        productId: '',
        transactionId: '',
        originalTransactionId: '',
        purchaseDate: new Date(),
        isTrialPeriod: false,
        isIntroOfferPeriod: false,
        autoRenewStatus: false,
        environment,
        error: 'No subscription purchases found in receipt'
      };
    }

    // Find the most recent subscription purchase
    const allPurchases = [...inAppPurchases, ...latestReceiptInfo];
    const subscriptionPurchases = allPurchases.filter(purchase => 
      purchase.product_id === 'premium_monthly' || purchase.product_id === 'premium_yearly'
    );

    if (subscriptionPurchases.length === 0) {
      return {
        success: true,
        isValid: false,
        isExpired: false,
        productId: '',
        transactionId: '',
        originalTransactionId: '',
        purchaseDate: new Date(),
        isTrialPeriod: false,
        isIntroOfferPeriod: false,
        autoRenewStatus: false,
        environment,
        error: 'No valid subscription purchases found'
      };
    }

    // Get the most recent purchase
    const latestPurchase = subscriptionPurchases.sort((a, b) => 
      parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms)
    )[0];

    // Find auto-renewal status
    const renewalInfo = pendingRenewalInfo.find(info => 
      info.original_transaction_id === latestPurchase.original_transaction_id
    );

    const autoRenewStatus = renewalInfo ? renewalInfo.auto_renew_status === '1' : true;

    // Check if subscription is expired
    let isExpired = false;
    let expirationDate: Date | undefined;

    if (latestPurchase.expires_date_ms) {
      expirationDate = new Date(parseInt(latestPurchase.expires_date_ms));
      isExpired = expirationDate < new Date();
    }

    const isTrialPeriod = latestPurchase.is_trial_period === 'true';
    const isIntroOfferPeriod = latestPurchase.is_in_intro_offer_period === 'true';

    console.log('✅ Receipt validation successful:', {
      productId: latestPurchase.product_id,
      transactionId: latestPurchase.transaction_id,
      isExpired,
      autoRenewStatus,
      environment
    });

    return {
      success: true,
      isValid: true,
      isExpired,
      productId: latestPurchase.product_id,
      transactionId: latestPurchase.transaction_id,
      originalTransactionId: latestPurchase.original_transaction_id,
      purchaseDate: new Date(parseInt(latestPurchase.purchase_date_ms)),
      expirationDate,
      isTrialPeriod,
      isIntroOfferPeriod,
      autoRenewStatus,
      environment
    };
  }

  /**
   * Validate subscription status for a user
   */
  async validateUserSubscription(userId: string, receiptData: string): Promise<{
    success: boolean;
    subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'invalid';
    details: ValidationResult;
  }> {
    try {
      const validationResult = await this.validateReceipt(receiptData);

      if (!validationResult.success) {
        return {
          success: false,
          subscriptionStatus: 'invalid',
          details: validationResult
        };
      }

      if (!validationResult.isValid) {
        return {
          success: true,
          subscriptionStatus: 'invalid',
          details: validationResult
        };
      }

      if (validationResult.isExpired) {
        return {
          success: true,
          subscriptionStatus: 'expired',
          details: validationResult
        };
      }

      if (!validationResult.autoRenewStatus) {
        return {
          success: true,
          subscriptionStatus: 'cancelled',
          details: validationResult
        };
      }

      return {
        success: true,
        subscriptionStatus: 'active',
        details: validationResult
      };
    } catch (error) {
      console.error('❌ User subscription validation error:', error);
      return {
        success: false,
        subscriptionStatus: 'invalid',
        details: {
          success: false,
          isValid: false,
          isExpired: false,
          productId: '',
          transactionId: '',
          originalTransactionId: '',
          purchaseDate: new Date(),
          isTrialPeriod: false,
          isIntroOfferPeriod: false,
          autoRenewStatus: false,
          environment: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get subscription expiration date from receipt
   */
  getExpirationDate(receiptData: string): Promise<Date | null> {
    return this.validateReceipt(receiptData).then(result => {
      if (result.success && result.isValid && result.expirationDate) {
        return result.expirationDate;
      }
      return null;
    });
  }

  /**
   * Check if subscription is in trial period
   */
  isInTrialPeriod(receiptData: string): Promise<boolean> {
    return this.validateReceipt(receiptData).then(result => {
      return result.success && result.isValid && result.isTrialPeriod;
    });
  }

  /**
   * Check if subscription is in intro offer period
   */
  isInIntroOfferPeriod(receiptData: string): Promise<boolean> {
    return this.validateReceipt(receiptData).then(result => {
      return result.success && result.isValid && result.isIntroOfferPeriod;
    });
  }
}

// Export singleton instance with default configuration
export const receiptValidator = new ReceiptValidator(
  'com.eventdiscovery.app', // Bundle ID
  '1.0.5', // App version
  process.env.APPLE_SHARED_SECRET // Shared secret from environment
);

export default ReceiptValidator;
