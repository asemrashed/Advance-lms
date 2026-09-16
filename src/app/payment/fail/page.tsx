'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LuX as XCircle, LuArrowRight as ArrowRight, LuRefreshCw as RefreshCw, LuBookOpen as BookOpen, LuMessageCircle as MessageCircle, LuCopy as Copy, LuCheck as Check, LuTriangleAlert as AlertCircle, LuHouse as Home } from 'react-icons/lu';

// Client-side logging function
const logPaymentFailed = async (data: {
  transactionId: string;
  error: string;
  amount?: string;
  currency?: string;
  details?: any;
}) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    await fetch('/api/payment/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'failed',
        transactionId: data.transactionId,
        status: data.error,
        amount: data.amount,
        currency: data.currency,
        details: data.details
      })
    });
  } catch (error) {
    console.error('Failed to log payment failure:', error);
  }
};

interface PaymentFailData {
  status: string;
  transactionId: string;
  amount: string;
  currency: string;
  paymentDate: string;
  errorReason: string;
  enrollment: {
    id: string;
    status: string;
    paymentStatus: string;
  };
  course?: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

function PaymentFailContent() {
  const router = useRouter();
  const [paymentData, setPaymentData] = useState<PaymentFailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentData = async () => {
    try {
      if (typeof window === 'undefined') {
        setError('Page not available on server side');
        setLoading(false);
        return;
      }

        const urlParams = new URLSearchParams(window.location.search);
      const valId = urlParams.get('val_id');
      const tranId = urlParams.get('tran_id');
        const sessionKey = urlParams.get('sessionkey');
        const errorMessage = urlParams.get('error');
        const failedReason = urlParams.get('failedreason');

        if (tranId) {
          // Try to fetch payment data from database
          try {
            const paymentResponse = await fetch(`/api/payments/${tranId}`);
            const paymentResult = await paymentResponse.json();

            if (paymentResponse.ok && paymentResult.success) {
              if (paymentResult.data?.courseId) {
                setCourseId(paymentResult.data.courseId);
      }

              setPaymentData({
                status: paymentResult.data.status || 'failed',
                transactionId: paymentResult.data.transactionId || tranId,
                amount: paymentResult.data.amount || '0',
                currency: paymentResult.data.currency || 'BDT',
                paymentDate: paymentResult.data.initiatedAt || new Date().toISOString(),
                errorReason: errorMessage || failedReason || paymentResult.data.errorReason || 'Payment could not be processed',
                enrollment: paymentResult.data.enrollment || { id: '', status: 'pending', paymentStatus: 'failed' },
                course: paymentResult.data.course
              });
            } else {
              // Use URL parameters if database fetch fails
              setPaymentData({
                status: 'failed',
                transactionId: tranId,
                amount: urlParams.get('amount') || '0',
                currency: urlParams.get('currency') || 'BDT',
                paymentDate: new Date().toISOString(),
                errorReason: errorMessage || failedReason || 'Payment could not be processed',
                enrollment: { id: '', status: 'pending', paymentStatus: 'failed' }
              });
            }
          } catch (dbError) {
            // Use URL parameters if database fetch fails
            setPaymentData({
              status: 'failed',
              transactionId: tranId,
              amount: urlParams.get('amount') || '0',
              currency: urlParams.get('currency') || 'BDT',
              paymentDate: new Date().toISOString(),
              errorReason: errorMessage || failedReason || 'Payment could not be processed',
              enrollment: { id: '', status: 'pending', paymentStatus: 'failed' }
        });
          }

          // Log payment failure
          await logPaymentFailed({
            transactionId: tranId,
            error: errorMessage || failedReason || 'Payment failed',
            amount: urlParams.get('amount') || '0',
            currency: urlParams.get('currency') || 'BDT',
          details: { 
            valId,
              sessionKey,
              errorMessage,
              failedReason
          }
        });
        } else {
          setError('No transaction ID provided');
      }
      } catch (err) {
        console.error('Error processing payment failure:', err);
        setError('Failed to process payment information');
    } finally {
      setLoading(false);
    }
    };

    fetchPaymentData();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const truncateTransactionId = (id: string) => {
    if (id === 'N/A') return id;
    if (id.length <= 20) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
  };

  const handleRetryPayment = () => {
    if (courseId) {
      router.push(`/course/${courseId}`);
    } else {
      // Try to extract course ID from transaction ID
      const urlParams = new URLSearchParams(window.location.search);
      const tranId = urlParams.get('tran_id');
      if (tranId && tranId.includes('ENROLL_')) {
        const extractedCourseId = tranId.split('_')[1];
        router.push(`/course/${extractedCourseId}`);
    } else {
      router.push('/');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg text-gray-700 font-medium" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
            Payment information is being verified...
          </p>
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
            Payment Error
          </h1>
          <p className="text-gray-600 mb-8" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="w-full rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3.5 font-semibold text-white transition-all hover:shadow-lg"
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5" />
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>Try Again</span>
              </div>
            </button>
            <Link href="/">
              <button className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50">
                <div className="flex items-center justify-center gap-2">
                  <Home className="w-5 h-5" />
                  <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>Go Home</span>
                </div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-12">
        <div className="w-full max-w-3xl">
          {/* Failure Header Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6 animate-fade-in-up">
            <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 p-8 text-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                  <XCircle className="w-14 h-14 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  😔 Payment Failed
                </h1>
                <p className="text-xl text-white/90" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  Sorry, your payment could not be processed
                </p>
              </div>
            </div>

            {/* Course Info (if available) */}
            {paymentData?.course && (
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  {paymentData.course.thumbnailUrl && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={paymentData.course.thumbnailUrl}
                        alt={paymentData.course.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      Course
                    </p>
                    <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      {paymentData.course.title}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                Transaction Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    Transaction ID
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {truncateTransactionId(paymentData?.transactionId || 'N/A')}
                    </p>
                    {paymentData?.transactionId && paymentData.transactionId !== 'N/A' && (
                      <button
                        onClick={() => copyToClipboard(paymentData.transactionId)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copy full transaction ID"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    Amount
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    ৳ {paymentData?.amount}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    Date
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {paymentData?.paymentDate 
                      ? new Date(paymentData.paymentDate).toLocaleDateString('bn-BD', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) 
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    Status
                  </p>
                  <p className="text-sm font-medium text-red-600">
                    Failed
                  </p>
                </div>
              </div>
            </div>

            {/* Error Information */}
            <div className="px-6 pb-6">
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-800 font-bold text-lg mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      What is the problem?
                    </p>
                    <p className="text-red-700 text-sm mb-3" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      {paymentData?.errorReason || 'Your payment could not be processed. It may be due to insufficient balance, incorrect card details, or network issues.'}
                  </p>
                  </div>
                </div>
                </div>
              </div>
            </div>

          {/* Common Reasons Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
              Common Reasons for Payment Failure
            </h3>
            <div className="space-y-4">
              {[
                'Insufficient balance in your account',
                'Incorrect card number, expiry date, or CVV',
                'Card has expired or is blocked',
                'Network connection issues',
                'Bank transaction declined'
              ].map((reason, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-700 flex-1" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    {reason}
                  </p>
                </div>
              ))}
                </div>
                </div>

          {/* Support Information Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-blue-800 font-bold text-lg mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    Need Help?
                  </p>
                  <p className="text-blue-700 text-sm" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    If you leave the problem unresolved, please contact our support team. We are here to help you complete your enrollment.
                  </p>
                </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <button
                onClick={handleRetryPayment}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 hover:from-red-600 hover:via-rose-600 hover:to-pink-700 text-white px-6 py-4 font-bold text-lg transition-all hover:shadow-xl transform hover:scale-105"
              >
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6" />
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>Try Payment Again</span>
                <ArrowRight className="w-6 h-6" />
              </div>
            </button>
              <Link href="/" className="flex-1">
              <button className="w-full rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-4 font-bold text-lg transition-all hover:shadow-lg">
                <div className="flex items-center justify-center gap-3">
                  <Home className="w-5 h-5" />
                  <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>Go Home</span>
                </div>
              </button>
              </Link>
            </div>

          {/* Additional Information */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
              You can try using a different payment method or contact your bank for assistance.
                  </p>
                </div>
              </div>
            </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg text-gray-700 font-medium" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
            Loading...
          </p>
        </div>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
