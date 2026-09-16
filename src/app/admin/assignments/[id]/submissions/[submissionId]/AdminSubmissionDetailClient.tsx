'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LuEye as Eye, LuDownload as Download, LuArrowLeft as ArrowLeft, LuUser as User, LuCalendar as Calendar, LuTarget as Target, LuFileText as LuFileText } from 'react-icons/lu';;
import { assignmentsStaffService } from '@/services/assignmentsStaffService';
import { AssignmentSubmission } from '@/types/assignment';

export default function AdminViewSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await assignmentsStaffService.getSubmissionDetail(assignmentId, submissionId);
      const data = await res.json();
      if (res.ok) {
        const list = data.data?.submissions || data.submissions || [];
        const found = Array.isArray(list) ? list.find((s: any) => s._id === submissionId) : null;
        setSubmission(found || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [assignmentId, submissionId]);

  const handleDownload = () => {
    if (!submission?.files?.length) return;
    for (const f of submission.files) {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = f.name || 'submission-file';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <WelcomeSection title="Submission Details" description="View the student's submission, content, and files." />

        <PageSection title="Overview" className="mb-4">
          <Card className="border-2" style={{
            borderColor: 'rgba(123, 44, 191, 0.2)',
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: '#7B2CBF' }} />
                {submission ? (typeof submission.student === 'object' ? (submission.student as any).name : 'Student') : 'Student'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Submitted: {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span>Score: {submission?.score !== undefined ? `${submission.score}/${submission?.maxScore}` : 'Not graded'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <LuFileText className="w-4 h-4 text-gray-500" />
                  <span>Attempt: {submission?.attemptNumber ?? '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection title="Content" className="mb-4">
          <Card className="border-2 border-gray-200">
            <CardContent className="p-4 whitespace-pre-wrap text-gray-900">
              {loading ? 'Loading...' : (submission?.content || 'No content provided.')}
            </CardContent>
          </Card>
        </PageSection>

        <PageSection title="LuFiles">
          <Card className="border-2" style={{
            borderColor: 'rgba(168, 85, 247, 0.2)',
          }}>
            <CardContent className="p-4">
              {submission?.files?.length ? (
                <div className="flex flex-col gap-2">
                  {submission.files.map((f) => (
                    <div key={f.url} className="flex items-center justify-between border rounded-md p-2">
                      <div className="text-sm text-gray-800 truncate mr-2">{f.name}</div>
                      <Button variant="outline" size="sm" onClick={() => { const a = document.createElement('a'); a.href = f.url; a.download = f.name || 'submission-file'; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}>
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button 
                      onClick={handleDownload} 
                      className="mt-2 text-white transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                        boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download All
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No files uploaded.</div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </main>
    </AdminRoleShell>
  );
}


