import React from 'react';
import { FileText, Download, File, Shield, Book, Calendar, Image, HelpCircle } from 'lucide-react';

export interface ClientDocument {
  id: string;
  document_name: string;
  document_type: 'contract' | 'warranty' | 'manual' | 'schedule' | 'photos' | 'other';
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_at: string;
}

interface DocumentLibraryProps {
  documents: ClientDocument[];
  onDownload: (documentId: string) => void;
}

const documentTypeIcons: Record<string, React.ReactNode> = {
  contract: <FileText className="w-5 h-5 text-blue-400" />,
  warranty: <Shield className="w-5 h-5 text-emerald-400" />,
  manual: <Book className="w-5 h-5 text-purple-400" />,
  schedule: <Calendar className="w-5 h-5 text-yellow-400" />,
  photos: <Image className="w-5 h-5 text-pink-400" />,
  other: <File className="w-5 h-5 text-gray-400" />
};

const documentTypeLabels: Record<string, string> = {
  contract: 'Contract',
  warranty: 'Warranty',
  manual: 'Manual',
  schedule: 'Schedule',
  photos: 'Photos',
  other: 'Document'
};

const documentTypeColors: Record<string, string> = {
  contract: 'bg-blue-500/10 border-blue-500/30',
  warranty: 'bg-emerald-500/10 border-emerald-500/30',
  manual: 'bg-purple-500/10 border-purple-500/30',
  schedule: 'bg-yellow-500/10 border-yellow-500/30',
  photos: 'bg-pink-500/10 border-pink-500/30',
  other: 'bg-gray-500/10 border-gray-500/30'
};

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ documents, onDownload }) => {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, ClientDocument[]>);

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
        <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No documents available yet</p>
        <p className="text-xs text-gray-600 mt-1">Documents will appear here once uploaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedDocs).map(([type, docs]) => (
        <div key={type}>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            {documentTypeIcons[type]}
            {documentTypeLabels[type]}s ({docs.length})
          </h3>

          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-xl border ${documentTypeColors[type]} hover:bg-white/5 transition-colors`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {documentTypeIcons[type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">
                        {doc.document_name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatFileSize(doc.file_size_bytes)}</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDownload(doc.id)}
                    className="flex-shrink-0 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
