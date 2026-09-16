'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LuTriangleAlert as AlertCircle, LuArrowLeft as ArrowLeft, LuRefreshCw as RefreshCw, LuBookOpen as BookOpen, LuClock as Clock } from 'react-icons/lu';;

// Client-side logging function
const logPaymentCancel = async (data: {
  transactionId: string;
  amount?: string;
  currency?: string;
  details?: any;
}) => {
  try {
    await fetch('/api/payment/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'cancel',
        transactionId: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        details: data.details
      })
    });
  } catch (error) {
    console.error('Failed to log payment cancellation:', error);
  }
};

interface PaymentCancelData {
  status: string;
  transactionId: string;
  amount: string;
  currency: string;
  paymentDate: string;
  enrollment: {
    id: string;
    status: string;
    paymentStatus: string;
  };
}

function PaymentCancelContent() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<PaymentCancelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        setError('Page not available on server side');
        setLoading(false);
        return;
      }

      // Get URL parameters manually to avoid useSearchParams issues with null values
      let urlParams;
      try {
        urlParams = new URLSearchParams(window.location.search);
      } catch (urlError) {
        console.error('Error parsing URL parameters:', urlError);
        setError('Invalid URL parameters');
        setLoading(false);
        return;
      }

      const valId = urlParams.get('val_id');
      const tranId = urlParams.get('tran_id');
      const sessionLuKey = urlParams.get('sessionkey');

      if (valId || tranId || sessionLuKey) {
        validatePayment(valId, tranId, sessionLuKey);
      } else {
        // Log payment cancellation with no parameters
        logPaymentCancel({
          transactionId: 'N/A',
          amount: 'N/A',
          currency: 'BDT',
          details: { reason: 'No payment parameters in URL' }
        });
        
        setError('No payment validation parameters found');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error getting search params:', err);
      
      // Log payment cancellation due to error
      logPaymentCancel({
        transactionId: 'N/A',
        amount: 'N/A',
        currency: 'BDT',
        details: { error: err }
      });
      
      setError('Invalid URL parameters');
      setLoading(false);
    }
  }, []); // Empty dependency array since we're not using searchParams anymore

  const validatePayment = async (valId: string | null, tranId: string | null, sessionLuKey: string | null) => {
    try {
      const response = await fetch('/api/payment/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valId,
          tranId,
          sessionLuKey
        })
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);
        
        // Log payment cancellation (even though validation succeeded, user was redirected to cancel page)
        logPaymentCancel({
          transactionId: result.data.transactionId,
          amount: result.data.amount,
          currency: result.data.currency,
          details: { 
            validationSuccess: true,
            enrollment: result.data.enrollment,
            reason: 'User redirected to cancel page despite successful validation'
          }
        });
      } else {
        // Log payment validation failure
        logPaymentCancel({
          transactionId: tranId || 'N/A',
          amount: 'N/A',
          currency: 'BDT',
          details: { 
            validationError: result.error,
            valId,
            tranId,
            sessionLuKey
          }
        });
        
        setError(result.error || 'Payment validation failed');
      }
    } catch (error) {
      console.error('Payment validation error:', error);
      
      // Log payment cancellation due to validation error
      logPaymentCancel({
        transactionId: tranId || 'N/A',
        amount: 'N/A',
        currency: 'BDT',
        details: { 
          validationError: error,
          valId,
          tranId,
          sessionLuKey
        }
      });
      
      setError('Failed to validate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPayment = () => {
    // Get course ID from the transaction ID or redirect to course selection
    const urlParams = new URLSearchParams(window.location.search);
    const tranId = urlParams.get('tran_id');
    if (tranId && tranId.includes('ENROLL_')) {
      const courseId = tranId.split('_')[1];
      router.push(`/course/${courseId}`);
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing payment status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={handleRetryPayment} className="w-full rounded-lg bg-gradient-to-r from-primary to-primary/70 hover:primary text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Payment Cancelled
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              You cancelled the payment process
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <p className="font-mono text-sm">{paymentData?.transactionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold">৳ {paymentData?.amount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cancelled Date</p>
                  <p className="text-sm">{paymentData?.paymentDate ? new Date(paymentData.paymentDate).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-sm text-yellow-600 font-medium">Cancelled</p>
                </div>
              </div>
            </div>

            {/* Cancellation LuInformation */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-yellow-800 font-medium mb-1">No charges were made</h4>
                  <p className="text-yellow-700 text-sm">
                    Since you cancelled the payment, no money has been deducted from your account. 
                    You can try again anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Why Cancel? */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Common reasons for cancellation:</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2"></div>
                  <p className="text-sm text-gray-600">Changed your mind about the purchase</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2"></div>
                  <p className="text-sm text-gray-600">Wanted to review course details again</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2"></div>
                  <p className="text-sm text-gray-600">Decided to use a different payment method</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 mt-2"></div>
                  <p className="text-sm text-gray-600">Accidentally closed the payment window</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">What would you like to do?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Try the payment again</p>
                    <p className="text-sm text-gray-600">Complete your enrollment with the same payment method</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Use a different payment method</p>
                    <p className="text-sm text-gray-600">Try with a different card or payment option</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Browse other courses</p>
                    <p className="text-sm text-gray-600">Explore our catalog of available courses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRetryPayment}
                className="flex-1 bg-gradient-to-r from-primary to-primary/50 hover:from-primary-container hover:to-primary/50 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Payment Again
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </div>

            {/* Additional Options */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/student/courses" className="flex-1">
                <Button variant="outline" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  My Courses
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>

            {/* Support LuInformation */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Need assistance? Our support team is here to help you complete your enrollment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
