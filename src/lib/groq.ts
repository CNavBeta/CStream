export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendMessageToCAi(
  messages: ChatMessage[],
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: !!onStreamChunk,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur API: ${response.status}`);
  }

  if (onStreamChunk) {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming non supporté');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              onStreamChunk(fullContent);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              buffer = trimmedLine + '\n' + buffer;
              break;
            }
            throw e;
          }
        }
      }
    }

    if (buffer.trim()) {
      const trimmedBuffer = buffer.trim();
      if (trimmedBuffer.startsWith('data: ')) {
        const data = trimmedBuffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              onStreamChunk(fullContent);
            }
          } catch (e) {
          }
        }
      }
    }

    return fullContent;
  } else {
    const data = await response.json();
    return data.content || '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function formatLinks(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  
  return text.replace(urlRegex, (url) => {
    const domain = extractDomain(url);
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    
    return `
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-3 py-1.5 my-1 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:border-primary/50 transition-all group">
        <img src="${faviconUrl}" alt="" class="w-4 h-4 rounded" onerror="this.style.display='none'" />
        <span class="text-primary font-medium group-hover:underline">${escapeHtml(domain)}</span>
        <svg class="w-3 h-3 text-primary/60 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    `;
  });
}

export function formatMarkdown(text: string): string {
  if (!text) return '';
  
  const codeBlocks: string[] = [];
  let processedText = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = escapeHtml(lang || 'code');
    const escapedCode = escapeHtml(code.trim());
    const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
    
    const codeBlock = `
      <div class="code-block-container relative my-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-xl">
        <div class="code-header flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 backdrop-blur-sm">
          <div class="flex items-center gap-3">
            <div class="flex gap-1.5">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-green-500/80"></span>
            </div>
            <span class="text-xs font-mono font-semibold text-primary/90 uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10">${langLabel}</span>
          </div>
          <button data-code-id="${codeId}" class="copy-code-btn flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-primary/20 text-slate-300 hover:text-primary border border-slate-600/50 hover:border-primary/50 transition-all duration-200">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <span>Copier</span>
          </button>
        </div>
        <div class="code-content overflow-x-auto">
          <pre class="p-4 text-sm leading-relaxed"><code id="${codeId}" class="font-mono text-slate-200">${escapedCode}</code></pre>
        </div>
      </div>
    `;
    
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(codeBlock);
    return placeholder;
  });
  
  let formatted = processedText
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/__(.+?)__/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code bg-slate-800/60 text-primary px-2 py-0.5 rounded-md text-sm font-mono border border-slate-700/50">$1</code>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-3 text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc my-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal my-1">$1</li>');

  formatted = formatLinks(formatted);
  
  formatted = formatted.replace(/\n/g, '<br/>');
  formatted = formatted.replace(/(<li[^>]*>.*<\/li>)(<br\/>)?(<li)/g, '$1$3');
  
  codeBlocks.forEach((block, index) => {
    formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block);
  });
  
  return formatted;
}
