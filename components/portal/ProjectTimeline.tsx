import React from 'react';
import { FileText, Check, Calendar, Wrench, CheckCircle2, Circle } from 'lucide-react';

export interface ProjectData {
  id: string;
  name: string;
  createdAt: string;
  quote?: {
    sentAt?: string;
    approvedAt?: string;
  };
  invoice?: {
    sentAt?: string;
    paidAt?: string;
  };
  scheduledDate?: string;
  completedAt?: string;
}

interface ProjectTimelineProps {
  project: ProjectData;
}

interface TimelineStage {
  id: string;
  label: string;
  icon: React.ReactNode;
  date?: string;
  status: 'completed' | 'current' | 'pending';
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ project }) => {
  const stages: TimelineStage[] = [
    {
      id: 'created',
      label: 'Project Created',
      icon: <FileText className="w-5 h-5" />,
      date: project.createdAt,
      status: 'completed'
    },
    {
      id: 'quoted',
      label: 'Quote Sent',
      icon: <FileText className="w-5 h-5" />,
      date: project.quote?.sentAt,
      status: project.quote?.sentAt ? 'completed' : 'pending'
    },
    {
      id: 'approved',
      label: 'Quote Approved',
      icon: <Check className="w-5 h-5" />,
      date: project.quote?.approvedAt,
      status: project.quote?.approvedAt ? 'completed' : project.quote?.sentAt ? 'current' : 'pending'
    },
    {
      id: 'scheduled',
      label: 'Work Scheduled',
      icon: <Calendar className="w-5 h-5" />,
      date: project.scheduledDate,
      status: project.scheduledDate ? 'completed' : project.quote?.approvedAt ? 'current' : 'pending'
    },
    {
      id: 'completed',
      label: 'Work Completed',
      icon: <Wrench className="w-5 h-5" />,
      date: project.completedAt,
      status: project.completedAt ? 'completed' : project.scheduledDate ? 'current' : 'pending'
    },
    {
      id: 'invoiced',
      label: 'Invoice Sent',
      icon: <FileText className="w-5 h-5" />,
      date: project.invoice?.sentAt,
      status: project.invoice?.sentAt ? 'completed' : project.completedAt ? 'current' : 'pending'
    },
    {
      id: 'paid',
      label: 'Payment Received',
      icon: <CheckCircle2 className="w-5 h-5" />,
      date: project.invoice?.paidAt,
      status: project.invoice?.paidAt ? 'completed' : project.invoice?.sentAt ? 'current' : 'pending'
    }
  ];

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          line: 'bg-emerald-500/30'
        };
      case 'current':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          line: 'bg-white/10'
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          text: 'text-gray-500',
          line: 'bg-white/5'
        };
    }
  };

  return (
    <div className="space-y-1">
      {stages.map((stage, index) => {
        const colors = getStatusColor(stage.status);
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.id} className="relative">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center ${colors.text} relative z-10`}>
                {stage.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : stage.status === 'current' ? (
                  <Circle className="w-5 h-5 fill-current" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold ${stage.status === 'pending' ? 'text-gray-500' : 'text-white'}`}>
                    {stage.label}
                  </h4>
                  {stage.date && (
                    <span className="text-sm text-gray-400">
                      {formatDate(stage.date)}
                    </span>
                  )}
                </div>
                {stage.status === 'current' && !stage.date && (
                  <p className="text-sm text-gray-400 mt-1">In progress...</p>
                )}
                {stage.status === 'pending' && (
                  <p className="text-sm text-gray-500 mt-1">Pending</p>
                )}
              </div>
            </div>

            {/* Connecting Line */}
            {!isLast && (
              <div
                className={`absolute left-5 top-10 w-0.5 h-8 -ml-px ${colors.line}`}
                style={{ zIndex: 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
