import { useState, useCallback } from 'react';

interface PaymentInitiateRequest {
  courseId?: string;
  courseIds?: string[];
  batchId?: string;
  selectedBatchId?: string;
  studentId?: string;
  billingPlan?: "monthly" | "full";
}

interface PaymentInitiateResponse {
  success: boolean;
  data?: {
    checkout_url: string;
    transactionId: string;
  };
  error?: string;
}

interface PaymentValidationRequest {
  valId?: string;
  tranId?: string;
  sessionKey?: string;
}

interface PaymentValidationResponse {
  success: boolean;
  data?: {
    status: string;
    transactionId: string;
    amount: string;
    currency: string;
    paymentDate: string;
    bankTransactionId: string;
    cardType: string;
    cardIssuer: string;
    enrollment: {
      id: string;
      status: string;
      paymentStatus: string;
    };
  };
  error?: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initiate payment for course enrollment
  const initiatePayment = useCallback(async (request: PaymentInitiateRequest): Promise<PaymentInitiateResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Payment initiation failed');
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch {
      const errorMessage = 'Failed to initiate payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate payment status
  const validatePayment = useCallback(async (request: PaymentValidationRequest): Promise<PaymentValidationResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payment/validate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Payment validation failed');
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch {
      const errorMessage = 'Failed to validate payment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Redirect to payment gateway
  const redirectToPayment = useCallback((checkoutUrl: string) => {
    window.location.href = checkoutUrl;
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    initiatePayment,
    validatePayment,
    redirectToPayment,
    clearError
  };
};
