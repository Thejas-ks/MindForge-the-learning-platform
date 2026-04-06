import styles from './MarkdownRenderer.module.css';

// Parse and render AI response with ChatGPT-style formatting
export default function MarkdownRenderer({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines — add spacing
    if (line.trim() === '') {
      elements.push(<div key={key++} className={styles.spacer} />);
      i++;
      continue;
    }

    // H1: # heading
    if (/^# (.+)/.test(line)) {
      elements.push(<h1 key={key++} className={styles.h1}>{line.replace(/^# /, '')}</h1>);
      i++;
      continue;
    }

    // H2: ## heading
    if (/^## (.+)/.test(line)) {
      elements.push(<h2 key={key++} className={styles.h2}>{line.replace(/^## /, '')}</h2>);
      i++;
      continue;
    }

    // H3: ### heading
    if (/^### (.+)/.test(line)) {
      elements.push(<h3 key={key++} className={styles.h3}>{line.replace(/^### /, '')}</h3>);
      i++;
      continue;
    }

    // Code block: ```lang ... ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace('```', '').trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={key++} className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLang}>{lang}</span>
            <button className={styles.copyBtn} onClick={() => navigator.clipboard?.writeText(codeLines.join('\n'))}>
              Copy
            </button>
          </div>
          <pre className={styles.codePre}><code>{codeLines.join('\n')}</code></pre>
        </div>
      );
      continue;
    }

    // Inline code: `code`
    // Bullet list: - item or * item
    if (/^[-*] (.+)/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[-*] (.+)/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className={styles.ul}>
          {listItems.map((item, j) => (
            <li key={j} className={styles.li}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list: 1. item
    if (/^\d+\. (.+)/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+\. (.+)/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className={styles.ol}>
          {listItems.map((item, j) => (
            <li key={j} className={styles.li}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Bold line (entire line is **bold**)
    if (/^\*\*(.+)\*\*$/.test(line.trim())) {
      elements.push(
        <p key={key++} className={styles.boldLine}>{line.trim().replace(/^\*\*|\*\*$/g, '')}</p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className={styles.p}>{renderInline(line)}</p>
    );
    i++;
  }

  return <div className={styles.root}>{elements}</div>;
}

// Render inline formatting: **bold**, *italic*, `code`
function renderInline(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**')) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[0].startsWith('*')) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[0].startsWith('`')) parts.push(<code key={match.index} className="inlineCode">{match[4]}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}
