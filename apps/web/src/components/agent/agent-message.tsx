"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { ToolCallChain } from "./tool-call-indicator";
import type { AgentMessage as AgentMessageType } from "@/stores/agent-store";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const ENTITY_LINK_RE = /^(buyer|contract|scanner):(.+)$/;

// Inline SVG arrow icon for internal entity links (12x12, arrow-up-right style)
const ARROW_ICON = `<svg class="entity-link-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 2.5H9.5V8.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const renderer = new marked.Renderer();
renderer.link = ({ href, text }) => {
  const match = href.match(ENTITY_LINK_RE);
  if (match) {
    const [, entityType, rawId] = match;
    const [id, query] = rawId.split("?");
    const pathMap: Record<string, string> = {
      buyer: `/buyers/${id}`,
      contract: `/contracts/${id}`,
      scanner: `/scanners/${id}`,
    };
    const path = pathMap[entityType] ?? `/${entityType}s/${id}`;
    const fullPath = query ? `${path}?${query}` : path;
    return `<a href="${fullPath}" data-internal class="entity-link">${text}${ARROW_ICON}</a>`;
  }
  if (href.startsWith("/")) {
    return `<a href="${href}" data-internal class="entity-link">${text}${ARROW_ICON}</a>`;
  }
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="external-link">${text}</a>`;
};
marked.use({ renderer });

function renderMarkdown(content: string): string {
  const html = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "ul", "ol", "li", "a", "code", "pre",
      "h1", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "del", "hr", "span", "sup", "sub",
      "svg", "path",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "data-internal", "class",
      "width", "height", "viewBox", "fill", "xmlns",
      "d", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    ],
  });
}

interface AgentMessageProps {
  message: AgentMessageType;
}

export function AgentMessage({ message }: AgentMessageProps) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();

  const htmlContent = useMemo(() => {
    if (message.role !== "assistant" || !message.content) return "";
    return renderMarkdown(message.content);
  }, [message.content, message.role]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-internal]");
      if (!target) return;
      e.preventDefault();
      const href = target.getAttribute("href");
      if (href) {
        router.push(href);
      }
    },
    [router]
  );

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  if (message.role === "user") {
    return (
      <motion.div {...motionProps} className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2.5 max-w-[85%] text-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps} className="space-y-1">
      {message.toolCalls && message.toolCalls.length > 0 && (
        <ToolCallChain toolCalls={message.toolCalls} />
      )}
      {message.content && (
        <div>
          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
              prose-headings:my-2 prose-pre:my-2 prose-table:my-2
              prose-a:no-underline
              text-[0.8125rem] leading-relaxed"
            onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}
    </motion.div>
  );
}
