import { useParams } from "react-router";
// Remove this line completely:
import ReactMarkdown from "react-markdown";

import documents from "./minisearch/ingestion/documents.json";

export default function DocumentPage() {
  const { "*": encodedId } = useParams();
  const id = encodedId ? decodeURIComponent(encodedId) : "";

  const doc = documents.find((d) => d.id === id);

  if (!doc) {
    return <div>Document not found</div>;
  }

  return (
    <div>
      <h1>{doc.title}</h1>
      <ReactMarkdown>{doc.content}</ReactMarkdown>
    </div>
  );
}
