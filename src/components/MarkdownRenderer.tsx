import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown Renderer Component with Auto-Collapsible Sections
 * 
 * Automatically converts Markdown H2 headers with emojis into collapsible sections.
 * 
 * Features:
 * - Markdown-to-HTML transformation for collapsible sections
 * - LaTeX formulas (inline: $formula$, block: $$formula$$)
 * - Code blocks, tables, blockquotes
 * - Auto-detection of section headers (## emoji Title)
 * 
 * Usage:
 * <MarkdownRenderer content={aiResponse} />
 */
export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  /**
   * Transform Markdown sections into HTML collapsible blocks
   * Detects patterns like: ## 📚 Concept Overview
   * Converts to: <details><summary>📚 Concept Overview</summary>\n\ncontent</details>
   */
  const transformToCollapsibleSections = (markdownContent: string): string => {
    // Pattern to match ## emoji Title (H2 headers with emojis)
    // Common emojis used in educational content
    const sectionPattern = /^##\s+([\u{1F300}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?)\s+(.+)$/gmu;
    
    // Split content by H2 headers with emojis
    const sections: Array<{ title: string; emoji: string; content: string }> = [];
    let currentSection: { title: string; emoji: string; content: string } | null = null;
    let preamble = '';
    
    const lines = markdownContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^##\s+([\u{1F300}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?)\s+(.+)$/u);
      
      if (match) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          emoji: match[1],
          title: match[2].trim(),
          content: ''
        };
      } else {
        // Add line to current section or preamble
        if (currentSection) {
          currentSection.content += line + '\n';
        } else {
          preamble += line + '\n';
        }
      }
    }
    
    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // If no sections found, return original content
    if (sections.length === 0) {
      return markdownContent;
    }
    
    // Build the transformed content with HTML details/summary tags
    let transformed = preamble;
    
    for (const section of sections) {
      transformed += `<details>\n`;
      transformed += `<summary>${section.emoji} ${section.title}</summary>\n\n`;
      transformed += section.content.trim() + '\n';
      transformed += `</details>\n\n`;
    }
    
    return transformed;
  };

  // Transform content to add collapsible sections
  const processedContent = transformToCollapsibleSections(content);

  return (
    <div className={`markdown-content prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Custom styling for headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-4 mt-6 text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold mb-3 mt-5 text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-2 mt-4 text-secondary">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mb-2 mt-3">{children}</h4>
          ),
          
          // Custom styling for paragraphs
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-foreground">{children}</p>
          ),
          
          // Custom styling for lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 ml-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 ml-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground leading-relaxed">{children}</li>
          ),
          
          // Custom styling for code blocks
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`block bg-muted p-4 rounded-lg mb-4 overflow-x-auto font-mono text-sm ${className}`} {...props}>
                {children}
              </code>
            );
          },
          
          // Custom styling for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Custom styling for tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">{children}</td>
          ),
          
          // Custom styling for links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              {children}
            </a>
          ),
          
          // Custom styling for strong/bold
          strong: ({ children }) => (
            <strong className="font-bold text-primary">{children}</strong>
          ),
          
          // Custom styling for emphasis/italic
          em: ({ children }) => (
            <em className="italic text-secondary">{children}</em>
          ),

          // Custom styling for collapsible sections
          details: ({ children }) => (
            <details className="group border border-border/40 rounded-2xl mb-6 overflow-hidden bg-gradient-to-b from-card/50 to-card/30 backdrop-blur-md transition-all duration-500 hover:border-primary/40 shadow-lg hover:shadow-primary/5">
              {children}
            </details>
          ),
          summary: ({ children }) => (
            <summary className="px-6 py-4 cursor-pointer font-bold text-lg text-primary flex items-center justify-between bg-muted/10 list-none transition-all duration-300 group-open:bg-primary/5 group-open:border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-open:bg-primary/20 transition-colors">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                {children}
              </div>
              <div className="text-muted-foreground group-open:rotate-180 transition-transform duration-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </summary>
          ),
          // We can't easily wrap rest of children, but we can use CSS in the details component or here
          // Actually, prose-invert will style p, ul, etc. inside. We just need to add padding.
        }}
        // Add a wrapper div for content inside details using rehype-raw or just global CSS
      >
        {content}
      </ReactMarkdown>
      <style>{`
        .markdown-content details > *:not(summary) {
          padding-left: 1.5rem;
          padding-right: 1.5rem;
          padding-top: 1.25rem;
          padding-bottom: 1.25rem;
        }
        .markdown-content details summary::-webkit-details-marker {
          display: none;
        }
        .markdown-content details summary {
          list-style: none;
        }
      `}</style>
    </div>
  );
};

export default MarkdownRenderer;
