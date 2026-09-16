'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LuCheck as CheckCircle, LuArrowRight as ArrowRight, LuBookOpen as BookOpen, LuShare2 as Share2 } from 'react-icons/lu';;

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const handleVerification = async () => {
      const tranId = searchParams.get('tran_id');
      const valId = searchParams.get('val_id');
      if (tranId && tranId !== 'null' && tranId !== 'undefined' && tranId.trim() !== '') {
        setTransactionId(tranId.trim());
        try {
          const response = await fetch('/api/payment/validate', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tranId: tranId.trim(),
              valId: valId?.trim() || undefined,
            }),
          });
          const result = await response.json();
          setVerified(Boolean(result?.success));
        } catch {
          setVerified(false);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(false);
    };

    handleVerification();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  // Generic success page when no transaction ID is available
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Your course enrollment has been confirmed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Generic Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Payment Processed Successfully</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                {verified
                  ? 'Your payment has been verified and your course enrollment is now active.'
                  : 'We are processing your payment verification. Please check your courses shortly.'}
              </p>
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">What's Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Access Your Course</p>
                    <p className="text-sm text-gray-600">Start learning immediately with full access to all course materials</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Download Resources</p>
                    <p className="text-sm text-gray-600">Get access to downloadable materials and resources</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Track Progress</p>
                    <p className="text-sm text-gray-600">Monitor your learning progress and complete assignments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/student/courses" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Go to My Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              {verified && transactionId && (
                <a
                  href={`/api/payments/${encodeURIComponent(transactionId)}/invoice`}
                  className="flex-1"
                  download
                >
                  <Button variant="outline" className="w-full">
                    Download invoice
                  </Button>
                </a>
              )}
            </div>

            {verified && (
              <div className="text-center">
                <Link
                  href="/student/payments"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View payment history →
                </Link>
              </div>
            )}

            {/* Support LuInformation */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              <p>Need help? Contact our support team or check your email for course access details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
