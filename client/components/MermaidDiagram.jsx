import React, { useEffect, useRef, useState, useCallback } from 'react';

const MermaidDiagram = React.memo(({ diagram, isStreaming }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const elementRef = useRef(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  // Load Mermaid library
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        // Check if mermaid is already loaded
        if (window.mermaid) {
          console.log('Mermaid already loaded');
          setMermaidLoaded(true);
          return;
        }

        console.log('Loading Mermaid...');
        const mermaid = await import('mermaid');
        
        // Initialize Mermaid with better configuration for visibility
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'Arial, sans-serif',
          themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#000000',
            primaryBorderColor: '#000000',
            lineColor: '#000000',
            secondaryColor: '#f4f4f4',
            tertiaryColor: '#ffffff',
            background: '#ffffff',
            mainBkg: '#ffffff',
            secondBkg: '#f4f4f4',
            tertiaryBkg: '#ffffff'
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true
          },
          gantt: {
            useMaxWidth: true
          }
        });

        window.mermaid = mermaid.default;
        setMermaidLoaded(true);
        console.log('Mermaid loaded successfully');
      } catch (err) {
        console.error('Failed to load Mermaid:', err);
        setError(`Failed to load Mermaid: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadMermaid();
  }, []);

  // Store the last rendered diagram to prevent unnecessary re-renders
  const lastRenderedDiagram = useRef(null);

  // Render diagram only when Mermaid is loaded and streaming is complete
  useEffect(() => {
    // Don't render if still loading, no diagram, or still streaming
    if (!mermaidLoaded || !diagram || isStreaming) {
      if (isStreaming) {
        setIsLoading(true);
        setIsRendered(false);
      }
      return;
    }

    // Prevent re-rendering if already rendered with the same diagram
    if (lastRenderedDiagram.current === diagram && isRendered) {
      console.log('Skipping Mermaid re-render - same diagram already rendered');
      return;
    }

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const element = elementRef.current;
        if (!element) {
          throw new Error('Element not found');
        }

        console.log('Rendering Mermaid diagram (streaming complete)...');
        
        // Clear previous content
        element.innerHTML = '';
        
        // Remove data-processed attribute to allow re-rendering
        element.removeAttribute('data-processed');
        
        // Set the diagram content
        element.textContent = diagram;
        element.className = 'mermaid';
        element.id = idRef.current;

        // Use the latest Mermaid API
        await window.mermaid.run({
          nodes: [element]
        });

        console.log('Mermaid diagram rendered successfully');
        
        // Mark this diagram as rendered
        lastRenderedDiagram.current = diagram;
        
        // Small delay to ensure rendering is complete before showing
        window.setTimeout(() => {
          setIsLoading(false);
          setIsRendered(true);
        }, 100);
        
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(`Rendering error: ${err.message}`);
        setIsLoading(false);
        setIsRendered(false);
        
        // Fallback: show as code block
        if (elementRef.current) {
          elementRef.current.innerHTML = `<pre><code>${diagram}</code></pre>`;
        }
      }
    };

    // Add a longer delay to ensure streaming is truly complete and avoid interference
    const timeoutId = window.setTimeout(renderDiagram, 800);
    return () => window.clearTimeout(timeoutId);
  }, [mermaidLoaded, diagram, isStreaming]);

  if (!mermaidLoaded) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
        <div className="text-sm text-gray-600">Loading Mermaid...</div>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="bg-gray-900 rounded-md p-4">
        <div className="text-gray-400 text-sm mb-2">Mermaid (waiting for complete code...)</div>
        <pre className="text-green-400 text-sm overflow-x-auto">
          <code>{diagram}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
          <div className="text-red-700 text-sm font-medium">Diagram Error</div>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg z-10 mermaid-loading-overlay">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm text-gray-600">Rendering diagram...</div>
            </div>
          </div>
        )}
        
        {/* Diagram container */}
        <div 
          ref={elementRef}
          id={idRef.current}
          className="mermaid-container"
          style={{ 
            minHeight: '100px',
            opacity: isRendered ? 1 : 0,
            textAlign: 'center',
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      </div>
    </div>
  );
});

// Add display name for debugging
MermaidDiagram.displayName = 'MermaidDiagram';

export default MermaidDiagram; 