import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** RichTextEditor 组件属性 */
interface RichTextEditorProps {
  /** HTML 字符串内容 */
  value: string;
  /** 内容变更回调，输出 HTML 字符串 */
  onChange: (html: string) => void;
  /** 自定义类名 */
  className?: string;
  /** 占位文本 */
  placeholder?: string;
}

/**
 * 基于 TipTap 的富文本编辑器组件
 * 支持加粗、斜体、标题、列表、引用、链接等格式
 * 兼容 react-hook-form 的 Controller 组件
 */
export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 启用加粗、斜体、标题、有序/无序列表、引用
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none min-h-[120px] px-3 py-2 outline-none",
          // 编辑器内容区域排版样式
          "[&_p]:my-1 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1.5",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
          "[&_li]:my-0.5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-1",
          "[&_a]:text-primary [&_a]:underline"
        ),
      },
    },
  });

  // 外部 value 变更时同步到编辑器（避免光标跳动）
  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    // 仅在外部值与编辑器内容不同时更新
    if (value !== currentHTML) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background",
        className
      )}
    >
      {/* 工具栏 */}
      <Toolbar editor={editor} />
      {/* 分隔线 */}
      <div className="border-t border-input" />
      {/* 编辑器内容区域 */}
      <EditorContent editor={editor} />
    </div>
  );
}


/** 工具栏组件 */
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1">
      {/* 加粗 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="加粗"
      >
        <Bold className="size-4" />
      </Toggle>

      {/* 斜体 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="斜体"
      >
        <Italic className="size-4" />
      </Toggle>

      {/* 分隔符 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 标题 H2 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="标题 H2"
      >
        <Heading2 className="size-4" />
      </Toggle>

      {/* 标题 H3 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="标题 H3"
      >
        <Heading3 className="size-4" />
      </Toggle>

      {/* 分隔符 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 无序列表 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() =>
          editor.chain().focus().toggleBulletList().run()
        }
        aria-label="无序列表"
      >
        <List className="size-4" />
      </Toggle>

      {/* 有序列表 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
        aria-label="有序列表"
      >
        <ListOrdered className="size-4" />
      </Toggle>

      {/* 引用 */}
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() =>
          editor.chain().focus().toggleBlockquote().run()
        }
        aria-label="引用"
      >
        <Quote className="size-4" />
      </Toggle>

      {/* 分隔符 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 链接 */}
      <LinkButton editor={editor} />
    </div>
  );
}

/** 链接按钮组件（带弹出输入框） */
function LinkButton({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  if (!editor) return null;

  const isActive = editor.isActive("link");

  /** 设置链接 */
  const handleSetLink = useCallback(() => {
    if (!url) {
      // 移除链接
      editor.chain().focus().unsetLink().run();
    } else {
      // 添加/更新链接
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setOpen(false);
    setUrl("");
  }, [editor, url]);

  /** 打开弹出框时，读取当前链接地址 */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && isActive) {
        const currentUrl = editor.getAttributes("link").href || "";
        setUrl(currentUrl);
      } else if (!nextOpen) {
        setUrl("");
      }
      setOpen(nextOpen);
    },
    [editor, isActive]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Toggle
          size="sm"
          pressed={isActive}
          onPressedChange={() => {
            // 如果已有链接，点击时移除
            if (isActive) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            // 否则打开弹出框
            setOpen(true);
          }}
          aria-label="链接"
        >
          <LinkIcon className="size-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">输入链接地址</p>
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setUrl("");
              }}
            >
              取消
            </Button>
            <Button size="sm" onClick={handleSetLink}>
              确认
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
