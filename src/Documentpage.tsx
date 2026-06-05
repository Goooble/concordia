import { useParams } from "react-router";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function DocumentPage() {
  const { "*": encodedId } = useParams();
  const id = encodedId ? decodeURIComponent(encodedId) : "";

  // 1. Setup UI states for the file data
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract the 'data/...' portion from the incoming path parameter
  const fileRelativePath = id.includes("data/")
    ? "data/" + id.split("data/")[1]
    : "";

  useEffect(() => {
    if (!fileRelativePath) {
      setError("No valid file path provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 2. Fetch the file relative to the public root ('/')
    fetch(`/${fileRelativePath}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not find document (${response.statusText})`);
        }
        return response.text(); // Read the raw file text/markdown instead of JSON
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching file:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [fileRelativePath]);

  // 3. Handle loading, error, and loaded UI states cleanly with Tailwind
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 font-medium">
        Loading document...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <h3 className="font-bold">Failed to load file</h3>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-xs mt-2 text-red-500/80 italic">
          Make sure your "data/" folder is placed inside the "public/"
          directory.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 py-12 px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
            {fileRelativePath}
          </span>
        </div>

        {/* 4. Render the markdown document dynamically */}
        <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
