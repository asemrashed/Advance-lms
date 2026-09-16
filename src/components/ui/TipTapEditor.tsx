"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderLatexToHtml } from "@/lib/math/renderMathHtml";
import { toLatex } from "@/lib/math/asciiToLatex";
import {
  LuBold,
  LuCode,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuMinus,
  LuPi,
  LuQuote,
  LuRedo2,
  LuSigma,
  LuStrikethrough,
  LuUnderline,
  LuUndo2,
  LuUnlink,
} from "react-icons/lu";

type MathDraft = {
  mode: "inline" | "block";
  latex: string;
  pos?: number;
  editing: boolean;
};

type TipTapEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  /** `blog` adds headings, underline, strike, link, code, and horizontal rule. */
  variant?: "basic" | "blog";
  /** Show optional inline/block equation buttons. Default true. */
  enableMath?: boolean;
};

function insertMath(editor: Editor, draft: MathDraft, latex: string) {
  const normalized = toLatex(latex);
  if (!normalized) return;

  if (draft.editing && typeof draft.pos === "number") {
    if (draft.mode === "block") {
      editor.chain().focus().updateBlockMath({ latex: normalized, pos: draft.pos }).run();
    } else {
      editor.chain().focus().updateInlineMath({ latex: normalized, pos: draft.pos }).run();
    }
    return;
  }

  const { empty } = editor.state.selection;
  const chain = empty
    ? editor.chain().focus()
    : editor.chain().focus().deleteSelection();

  if (draft.mode === "block") {
    chain.insertBlockMath({ latex: normalized }).run();
  } else {
    chain.insertInlineMath({ latex: normalized }).run();
  }
}

export function TipTapEditor({
  value = "",
  onChange,
  onBlur,
  placeholder = "Start writing…",
  className,
  minHeight = "140px",
  disabled = false,
  variant = "basic",
  enableMath = true,
}: TipTapEditorProps) {
  const isBlog = variant === "blog";
  const [mathDraft, setMathDraft] = useState<MathDraft | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: isBlog ? [1, 2, 3] : [2] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      ...(enableMath
        ? [
            Mathematics.configure({
              katexOptions: { throwOnError: false, strict: false },
              inlineOptions: {
                onClick: (node, pos) => {
                  setMathDraft({
                    mode: "inline",
                    latex: String(node.attrs.latex || ""),
                    pos,
                    editing: true,
                  });
                },
              },
              blockOptions: {
                onClick: (node, pos) => {
                  setMathDraft({
                    mode: "block",
                    latex: String(node.attrs.latex || ""),
                    pos,
                    editing: true,
                  });
                },
              },
            }),
          ]
        : []),
      ...(isBlog
        ? [
            Underline,
            Link.configure({
              openOnClick: false,
              HTMLAttributes: {
                class: "text-primary underline underline-offset-2",
              },
            }),
          ]
        : []),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "tiptap-course-description max-w-none px-3 py-3 text-sm text-foreground outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
    onBlur,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const toolbarButton = (
    label: string,
    active: boolean,
    action: () => void,
    icon: React.ReactNode,
  ) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={action}
    >
      {icon}
    </Button>
  );

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: trimmed })
      .run();
  };

  const openMathComposer = (mode: "inline" | "block") => {
    if (!editor) return;
    const selected = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " ",
    );
    setMathDraft({
      mode,
      latex: selected.trim(),
      editing: false,
    });
  };

  const previewHtml = mathDraft?.latex
    ? renderLatexToHtml(toLatex(mathDraft.latex), mathDraft.mode === "block")
    : "";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
        {toolbarButton(
          "Bold",
          Boolean(editor?.isActive("bold")),
          () => editor?.chain().focus().toggleBold().run(),
          <LuBold className="h-4 w-4" />,
        )}
        {toolbarButton(
          "Italic",
          Boolean(editor?.isActive("italic")),
          () => editor?.chain().focus().toggleItalic().run(),
          <LuItalic className="h-4 w-4" />,
        )}
        {isBlog
          ? toolbarButton(
              "Underline",
              Boolean(editor?.isActive("underline")),
              () => editor?.chain().focus().toggleUnderline().run(),
              <LuUnderline className="h-4 w-4" />,
            )
          : null}
        {isBlog
          ? toolbarButton(
              "Strikethrough",
              Boolean(editor?.isActive("strike")),
              () => editor?.chain().focus().toggleStrike().run(),
              <LuStrikethrough className="h-4 w-4" />,
            )
          : null}
        {isBlog
          ? toolbarButton(
              "Heading 1",
              Boolean(editor?.isActive("heading", { level: 1 })),
              () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
              <LuHeading1 className="h-4 w-4" />,
            )
          : null}
        {toolbarButton(
          "Heading 2",
          Boolean(editor?.isActive("heading", { level: 2 })),
          () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          <LuHeading2 className="h-4 w-4" />,
        )}
        {isBlog
          ? toolbarButton(
              "Heading 3",
              Boolean(editor?.isActive("heading", { level: 3 })),
              () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
              <LuHeading3 className="h-4 w-4" />,
            )
          : null}
        {toolbarButton(
          "Bullet list",
          Boolean(editor?.isActive("bulletList")),
          () => editor?.chain().focus().toggleBulletList().run(),
          <LuList className="h-4 w-4" />,
        )}
        {toolbarButton(
          "Numbered list",
          Boolean(editor?.isActive("orderedList")),
          () => editor?.chain().focus().toggleOrderedList().run(),
          <LuListOrdered className="h-4 w-4" />,
        )}
        {toolbarButton(
          "Quote",
          Boolean(editor?.isActive("blockquote")),
          () => editor?.chain().focus().toggleBlockquote().run(),
          <LuQuote className="h-4 w-4" />,
        )}
        {isBlog
          ? toolbarButton(
              "Code",
              Boolean(editor?.isActive("code")),
              () => editor?.chain().focus().toggleCode().run(),
              <LuCode className="h-4 w-4" />,
            )
          : null}
        {isBlog
          ? toolbarButton(
              "Horizontal rule",
              false,
              () => editor?.chain().focus().setHorizontalRule().run(),
              <LuMinus className="h-4 w-4" />,
            )
          : null}
        {isBlog
          ? toolbarButton(
              "Link",
              Boolean(editor?.isActive("link")),
              setLink,
              <LuLink className="h-4 w-4" />,
            )
          : null}
        {isBlog
          ? toolbarButton(
              "Remove link",
              false,
              () => editor?.chain().focus().unsetLink().run(),
              <LuUnlink className="h-4 w-4" />,
            )
          : null}
        {enableMath ? (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            {toolbarButton(
              "Inline equation",
              mathDraft?.mode === "inline",
              () => openMathComposer("inline"),
              <LuPi className="h-4 w-4" />,
            )}
            {toolbarButton(
              "Block equation",
              mathDraft?.mode === "block",
              () => openMathComposer("block"),
              <LuSigma className="h-4 w-4" />,
            )}
          </>
        ) : null}
        <span className="mx-1 h-5 w-px bg-border" />
        {toolbarButton(
          "Undo",
          false,
          () => editor?.chain().focus().undo().run(),
          <LuUndo2 className="h-4 w-4" />,
        )}
        {toolbarButton(
          "Redo",
          false,
          () => editor?.chain().focus().redo().run(),
          <LuRedo2 className="h-4 w-4" />,
        )}
      </div>
      {mathDraft && editor && !disabled ? (
        <div className="space-y-2 border-b border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {mathDraft.editing ? "Edit equation" : "Insert equation"} ·{" "}
              {mathDraft.mode === "block" ? "block" : "inline"}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={mathDraft.mode === "inline" ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setMathDraft((prev) => (prev ? { ...prev, mode: "inline" } : prev))}
              >
                Inline
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mathDraft.mode === "block" ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => setMathDraft((prev) => (prev ? { ...prev, mode: "block" } : prev))}
              >
                Block
              </Button>
            </div>
          </div>
          <textarea
            value={mathDraft.latex}
            onChange={(event) =>
              setMathDraft((prev) => (prev ? { ...prev, latex: event.target.value } : prev))
            }
            placeholder="Type LaTeX or ASCII math, e.g. e^(x^2 + 3) or f(x) = e^{(x^2+3)}"
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring/30"
            rows={2}
            autoFocus
          />
          <div className="min-h-10 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm">
            {previewHtml ? (
              <span
                className="math-content"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <span className="text-muted-foreground">Preview appears here</span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setMathDraft(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!toLatex(mathDraft.latex)}
              onClick={() => {
                insertMath(editor, mathDraft, mathDraft.latex);
                setMathDraft(null);
              }}
            >
              {mathDraft.editing ? "Update" : "Insert"}
            </Button>
          </div>
        </div>
      ) : null}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TipTapEditor;
