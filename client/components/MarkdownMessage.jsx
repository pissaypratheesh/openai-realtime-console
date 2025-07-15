import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MermaidDiagram from './MermaidDiagram';

const MarkdownMessage = React.memo(({ content, className = "", isStreaming = false }) => {
  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');
            

            // Handle Mermaid diagrams - check both explicit language and content detection
            const isMermaidByLanguage = !inline && language === 'mermaid';
            const isMermaidByContent = !inline && (
              codeContent.includes('graph TD') || 
              codeContent.includes('graph LR') || 
              codeContent.includes('sequenceDiagram') || 
              codeContent.includes('classDiagram') || 
              codeContent.includes('gitGraph') ||
              codeContent.includes('gantt') ||
              codeContent.includes('pie title') ||
              codeContent.includes('journey') ||
              codeContent.includes('stateDiagram')
            );
            
            // Render Mermaid diagrams (handles streaming internally)
            if (isMermaidByLanguage || isMermaidByContent) {
              console.log('Rendering Mermaid diagram:', { language, detected: isMermaidByLanguage ? 'by language' : 'by content' });
              // Create a stable key based on content to prevent unnecessary recreation
              const diagramKey = `mermaid-${codeContent.substring(0, 50).replace(/\s+/g, '-')}`;
              return (
                <div className="my-4" key={diagramKey}>
                  <MermaidDiagram 
                    key={diagramKey}
                    diagram={codeContent} 
                    isStreaming={isStreaming} 
                  />
                  {!isStreaming && (
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      Mermaid Diagram {isMermaidByContent && !isMermaidByLanguage ? '(auto-detected)' : ''}
                    </div>
                  )}
                </div>
              );
            }

            
            return !inline && match ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono" {...props}>
                  {codeContent}
                </code>
                {language && (
                  <div className="text-xs text-gray-400 mt-2 text-right">
                    {language}
                  </div>
                )}
              </pre>
            ) : (
              <code 
                className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            // Check if this is already handled by our code component
            const isCodeBlock = React.Children.toArray(children).some(
              child => child?.type === 'code' && child?.props?.className?.includes('language-')
            );
            
            if (isCodeBlock) {
              return <>{children}</>;
            }
            
            return (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto" {...props}>
                <code className="text-sm font-mono">{children}</code>
              </pre>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 bg-blue-50 py-2 rounded-r">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 rounded-lg">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-300 px-4 py-2">
                {children}
              </td>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-3 text-gray-800 border-b border-gray-200 pb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mb-2 text-gray-800">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-bold mb-2 text-gray-800">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-sm font-bold mb-2 text-gray-800">{children}</h4>;
          },
          p({ children }) {
            return <p className="mb-3 text-gray-800 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-3 text-gray-800 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-3 text-gray-800 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="mb-1">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-bold text-gray-900">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-700">{children}</em>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// Add display name for debugging
MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;