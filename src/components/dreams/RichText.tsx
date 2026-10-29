"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { BulletListIcon, NumberedListIcon } from "@/components/ui/ListIcons";

const images = (files: FileList | null | undefined) =>
  Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));

// A text box with bold, italic, underline (buttons, or Ctrl/Cmd + B / I / U) and lists.
// Lists start by themselves like Google Docs: type "- " or "* " for bullets, "1. " for numbers.
// Tab / Shift+Tab indents a list item in or out; Enter on an empty item ends the list.
// Pasting or dropping a picture hands it to `onFiles` instead of putting it in the text.
export default function RichText({
  initial,
  onChange,
  onFiles,
  placeholder,
  label,
  autoFocus,
}: {
  initial: string; // HTML
  onChange: (html: string) => void;
  onFiles: (files: File[]) => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
}) {
  // Always call the latest versions of the callbacks (the editor is only set up once).
  const latest = useRef({ onChange, onFiles });
  useEffect(() => {
    latest.current = { onChange, onFiles };
  });

  const editor = useEditor({
    immediatelyRender: false, // avoids a server/browser mismatch in Next
    extensions: [
      // Only paragraphs, line breaks, bold, italic, underline, lists and undo. Everything else is off.
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: "dream-text min-h-28 px-3.5 py-3 leading-relaxed text-ink",
        style: "outline: none", // the border darkens instead of a focus box
        "aria-label": label,
      },
      handlePaste: (_view, event) => {
        const files = images(event.clipboardData?.files);
        if (files.length === 0) return false; // plain text: paste as normal
        latest.current.onFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = images((event as DragEvent).dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        latest.current.onFiles(files);
        return true;
      },
    },
    onUpdate: ({ editor }) => latest.current.onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Which buttons are lit up for where the cursor is.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullets: e.isActive("bulletList"),
            numbers: e.isActive("orderedList"),
          }
        : null,
  });

  return (
    <div className="overflow-hidden rounded-control border-[1.5px] border-line bg-paper transition-colors focus-within:border-ink">
      <div className="flex gap-0.5 border-b border-line px-1.5 py-1">
        <FormatButton label="Bold (Ctrl/Cmd+B)" on={active?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <span className="font-bold">B</span>
        </FormatButton>
        <FormatButton label="Italic (Ctrl/Cmd+I)" on={active?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <span className="font-serif italic">I</span>
        </FormatButton>
        <FormatButton label="Underline (Ctrl/Cmd+U)" on={active?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <span className="underline underline-offset-2">U</span>
        </FormatButton>
        <span className="mx-1 h-4 w-px self-center bg-line" aria-hidden="true" />
        <FormatButton label="Bulleted list (or type - and a space)" on={active?.bullets} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <BulletListIcon />
        </FormatButton>
        <FormatButton label="Numbered list (or type 1. and a space)" on={active?.numbers} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <NumberedListIcon />
        </FormatButton>
      </div>
      {/* Before the editor loads, show an empty box of the same size so nothing jumps. */}
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-28" />}
    </div>
  );
}

function FormatButton({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={Boolean(on)}
      onMouseDown={(e) => e.preventDefault()} // keep the cursor in the text
      onClick={onClick}
      className={`grid size-7 place-items-center rounded-md text-sm transition-colors ${
        on ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
