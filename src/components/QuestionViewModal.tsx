'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LuEye as Eye, LuClock as Clock, LuTarget as Target, LuUser as User, LuCalendar as Calendar, LuTag as Tag, LuLightbulb as Lightbulb, LuCheck as CheckCircle, LuX as XCircle } from 'react-icons/lu';;
import { Question } from '@/types/exam';
import { format } from 'date-fns';
import { MathText } from '@/components/ui/MathText';

interface QuestionViewModalProps {
  open: boolean;
  question: Question | null;
  onClose: () => void;
}

export default function QuestionViewModal({ open, onClose, question }: QuestionViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!question) return null;

  if (!isVisible) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'written':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'true_false':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'fill_blank':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'essay':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
      open ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`} 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[min(85dvh,920px)] overflow-hidden transition-all duration-300 transform ${
        open ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Question Details</h2>
              <p className="text-sm text-gray-600">View question information and content</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className={`space-y-6 transition-all duration-500 delay-100 ${
            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            {/* Question Header */}
            <div className={`flex items-start justify-between transition-all duration-300 delay-200 ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Question</h3>
                <MathText as="p" className="text-gray-700 leading-relaxed" text={question.question} />
              </div>
              <div className="flex gap-2 ml-4">
                <Badge className={getTypeColor(question.type)}>
                  {question.type.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Question LuInfo */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300 delay-300 ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{question.marks} marks</div>
                    <div className="text-xs text-gray-500">Points</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {question.timeLimit ? `${question.timeLimit}m` : 'No limit'}
                    </div>
                    <div className="text-xs text-gray-500">Time limit</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${question.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {question.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-xs text-gray-500">Status</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* MCQ/True-False Options */}
            {(question.type === 'mcq' || question.type === 'true_false') && question.options && (
              <div className={`transition-all duration-300 delay-400 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Answer Options
                </h4>
                <div className="space-y-2">
                  {question.options?.map((option: { text: string; isCorrect: boolean }, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 flex items-center gap-3 ${
                        option.isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        option.isCorrect
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className={`flex-1 ${
                        option.isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'
                      }`}>
                        <MathText text={option.text} />
                      </span>
                      {option.isCorrect && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Written/Essay Correct Answer */}
            {(question.type === 'written' || question.type === 'essay') && question.correctAnswer && (
              <div className={`transition-all duration-300 delay-400 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Correct Answer
                </h4>
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-gray-800 leading-relaxed">{question.correctAnswer}</p>
                </Card>
              </div>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div className={`transition-all duration-300 delay-500 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  Explanation
                </h4>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <MathText as="p" className="text-gray-800 leading-relaxed" text={question.explanation} />
                </Card>
              </div>
            )}

            {/* Hints */}
            {question.hints && question.hints.length > 0 && (
              <div className={`transition-all duration-300 delay-600 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Hints
                </h4>
                <div className="space-y-2">
                  {question.hints.map((hint: string, index: number) => (
                    <Card key={index} className="p-3 bg-blue-50 border-blue-200">
                      <p className="text-gray-800 text-sm">{hint}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className={`transition-all duration-300 delay-700 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            {question.category && (
              <div className={`transition-all duration-300 delay-800 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Category
                </h4>
                <Badge variant="outline" className="text-sm">
                  {question.category}
                </Badge>
              </div>
            )}

            {/* Metadata */}
            <div className={`border-t border-gray-200 pt-4 transition-all duration-300 delay-900 ${
              open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Created by: {(question.createdBy as any)?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created: {format(new Date(question.createdAt), 'MMM dd, yyyy')}</span>
                </div>
                {question.updatedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Updated: {format(new Date(question.updatedAt), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
