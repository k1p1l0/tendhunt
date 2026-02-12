import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export interface BoardDocumentData {
  _id: string;
  title: string;
  meetingDate?: string | null;
  committeeName?: string;
  documentType?: string;
  sourceUrl: string;
  extractionStatus?: string;
}

interface BoardDocumentsTabProps {
  documents: BoardDocumentData[];
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(date?: string | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

const docTypeColors: Record<string, string> = {
  minutes:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  agenda:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  report:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  board_pack:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function docTypeLabel(type: string): string {
  switch (type) {
    case "board_pack":
      return "Board Pack";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function ExtractionIcon({ status }: { status?: string }) {
  switch (status) {
    case "extracted":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return null;
  }
}

export function BoardDocumentsTab({ documents }: BoardDocumentsTabProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <FileText className="h-10 w-10" />
        <p className="text-sm">No board documents found</p>
        <p className="text-xs text-center max-w-sm">
          Documents will appear as the enrichment pipeline processes this
          organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {documents.length} document{documents.length !== 1 ? "s" : ""} found
      </p>
      <div className="space-y-3">
        {documents.map((doc) => {
          const date = formatDate(doc.meetingDate);
          const typeColor =
            doc.documentType && docTypeColors[doc.documentType]
              ? docTypeColors[doc.documentType]
              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

          return (
            <Card key={doc._id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline text-primary flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">{doc.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {date && <span>{date}</span>}
                      {doc.committeeName && <span>{doc.committeeName}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.documentType && (
                      <Badge className={typeColor}>
                        {docTypeLabel(doc.documentType)}
                      </Badge>
                    )}
                    <ExtractionIcon status={doc.extractionStatus} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
