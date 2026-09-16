'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LuPlus as Plus, LuX as X, LuSave as Save, LuArrowLeft as ArrowLeft } from 'react-icons/lu';;
import { questionsStaffService } from '@/services/questionsStaffService';
import { CreateQuestionData } from '@/types/exam';
import { TipTapEditor } from '@/components/ui/TipTapEditor';

export default function CreateQuestionPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateQuestionData>({
    question: '',
    type: 'mcq',
    marks: 1,
    difficulty: 'easy',
    category: '',
    tags: [],
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    correctAnswer: '',
    explanation: '',
    hints: [],
    timeLimit: 0,
    exam: ''
  });

  const [newOption, setNewOption] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...formData.options!];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options!, { text: newOption.trim(), isCorrect: false }]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    if (formData.options!.length > 2) {
      const newOptions = formData.options!.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const addHint = () => {
    if (newHint.trim()) {
      setFormData(prev => ({
        ...prev,
        hints: [...prev.hints!, newHint.trim()]
      }));
      setNewHint('');
    }
  };

  const removeHint = (index: number) => {
    const newHints = formData.hints!.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, hints: newHints }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags!, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = formData.tags!.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await questionsStaffService.createAdminQuestion(formData);

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/exams');
      } else {
        console.error('Error creating question:', data.error);
        alert('Failed to create question: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminRoleShell>
      <AdminPageWrapper>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Question</h1>
                <p className="text-gray-600">Add a new question to your question bank</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic LuInformation */}
            <Card>
              <CardHeader>
                <CardTitle>Question Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Question *
                  </label>
                  <TipTapEditor
                    value={formData.question}
                    onChange={(html) => handleInputChange('question', html)}
                    placeholder="Write the question. Use π / Σ to insert equations, or type ASCII like e^(x^2 + 3)."
                    minHeight="120px"
                  />
                  <p className="text-xs text-muted-foreground">
                    Normal text stays as text. Equations are optional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Question Type *
                    </label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                    >
                      <SelectTrigger className="h-12 border-2 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm" style={{
                        borderColor: '#7B2CBF',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#A855F7'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#7B2CBF'}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#A855F7';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123, 44, 191, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#7B2CBF';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                        <SelectItem value="mcq" className="hover:bg-gray-100">Multiple Choice</SelectItem>
                        <SelectItem value="written" className="hover:bg-gray-100">Written/Essay</SelectItem>
                        <SelectItem value="true_false" className="hover:bg-gray-100">True/False</SelectItem>
                        <SelectItem value="fill_blank" className="hover:bg-gray-100">Fill in the Blank</SelectItem>
                        <SelectItem value="essay" className="hover:bg-gray-100">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <AttractiveInput
                    label="Marks *"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.marks}
                    onChange={(e) => handleInputChange('marks', parseInt(e.target.value) || 1)}
                    placeholder="Enter marks"
                    variant="default"
                    colorScheme="primary"
                    size="md"
                    icon="target"
                    helperText="Points for this question"
                    required
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Difficulty *
                    </label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleInputChange('difficulty', value)}
                    >
                      <SelectTrigger className="h-12 border-2 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm" style={{
                        borderColor: '#7B2CBF',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#A855F7'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#7B2CBF'}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#A855F7';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123, 44, 191, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#7B2CBF';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                        <SelectItem value="easy" className="hover:bg-gray-100">Easy</SelectItem>
                        <SelectItem value="medium" className="hover:bg-gray-100">Medium</SelectItem>
                        <SelectItem value="hard" className="hover:bg-gray-100">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <AttractiveInput
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="Enter category (optional)"
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  icon="tag"
                  helperText="Optional category for organization"
                />
              </CardContent>
            </Card>

            {/* MCQ Options */}
            {(formData.type === 'mcq' || formData.type === 'true_false') && (
              <Card>
                <CardHeader>
                  <CardTitle>Answer Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                        className="w-4 h-4"
                        style={{
                          accentColor: '#7B2CBF',
                        }}
                      />
                      <AttractiveInput
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        variant="default"
                        colorScheme="primary"
                        size="md"
                        className="flex-1"
                      />
                      {formData.options!.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <AttractiveInput
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option"
                      variant="default"
                      colorScheme="primary"
                      size="md"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={addOption}
                      className="text-white transition-all duration-200"
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
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Written Answer */}
            {(formData.type === 'written' || formData.type === 'essay') && (
              <Card>
                <CardHeader>
                  <CardTitle>Correct Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <AttractiveTextarea
                    label="Correct Answer *"
                    value={formData.correctAnswer}
                    onChange={(e) => handleInputChange('correctAnswer', e.target.value)}
                    placeholder="Enter the correct answer..."
                    rows={4}
                    variant="default"
                    colorScheme="primary"
                    size="md"
                    helperText="Provide the expected answer for this question"
                    required
                  />
                </CardContent>
              </Card>
            )}

            {/* Additional LuInformation */}
            <Card>
              <CardHeader>
                <CardTitle>Additional LuInformation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AttractiveTextarea
                  label="Explanation"
                  value={formData.explanation}
                  onChange={(e) => handleInputChange('explanation', e.target.value)}
                  placeholder="Explain why this is the correct answer..."
                  rows={3}
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  helperText="Optional explanation for the answer"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Hints
                  </label>
                  <div className="space-y-2">
                    {formData.hints?.map((hint, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary">{hint}</Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeHint(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <AttractiveInput
                        value={newHint}
                        onChange={(e) => setNewHint(e.target.value)}
                        placeholder="Add hint"
                        variant="default"
                        colorScheme="primary"
                        size="md"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={addHint}
                        className="text-white transition-all duration-200"
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
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Tags
                  </label>
                  <div className="space-y-2">
                    {formData.tags?.map((tag, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline">{tag}</Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTag(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <AttractiveInput
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag"
                        variant="default"
                        colorScheme="primary"
                        size="md"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={addTag}
                        className="text-white transition-all duration-200"
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
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="text-white transition-all duration-200 disabled:opacity-50"
                style={{
                  background: loading ? "rgba(236, 72, 153, 0.5)" : "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: loading ? "none" : "0 4px 15px rgba(236, 72, 153, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                  }
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Create Question
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </AdminPageWrapper>
    </AdminRoleShell>
  );
}
