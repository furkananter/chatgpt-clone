"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputAttachments,
  PromptInputAttachment,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { type FormEvent, useImperativeHandle, useRef } from "react";
import { type AttachmentPayload } from "@/lib/api/chat";

// Helper component to expose the clear function from the context
const AttachmentClearer = ({
  actionRef,
}: {
  actionRef: React.Ref<{ clear: () => void }>;
}) => {
  const { clear } = usePromptInputAttachments();
  useImperativeHandle(actionRef, () => ({
    clear,
  }));
  return null;
};

export function ChatInput({
  placeholder = "Message ChatGPT",
  onSubmit,
  selectedModel,
}: {
  placeholder?: string;
  onSubmit: (
    text: string,
    selectedModel: string,
    attachments?: AttachmentPayload[]
  ) => void;
  selectedModel: string;
}) {
  const attachmentClearerRef = useRef<{ clear: () => void }>(null);

  const handleSubmit = async (
    { text, files }: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => {
    if (!text?.trim() && (!files || files.length === 0)) {
      return;
    }

    const uploadedFiles =
      files && files.length > 0
        ? await Promise.all(
            files.map(async (filePart) => {
              if (!filePart.url) return null;
              const response = await fetch(filePart.url);
              const blob = await response.blob();
              const file = new File([blob], filePart.filename || "untitled", {
                type: filePart.mediaType,
              });

              const formData = new FormData();
              formData.append("file", file);
              formData.append(
                "upload_preset",
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
              );

              const res = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
                { method: "POST", body: formData }
              );
              const data = await res.json();

              URL.revokeObjectURL(filePart.url);

              return {
                type: "file",
                filename: data.original_filename ?? file.name,
                mediaType: file.type,
                url: String(data.secure_url),
              } as AttachmentPayload;
            })
          )
        : [];

    const validUploadedFiles = (uploadedFiles || []).filter(
      (file): file is AttachmentPayload => file !== null
    );

    onSubmit(text || "", selectedModel, validUploadedFiles);

    event.currentTarget.reset();
    attachmentClearerRef.current?.clear();
  };

  return (
    <div className="w-full max-w-[850px] mx-auto">
      <PromptInput onSubmit={handleSubmit}>
        <AttachmentClearer actionRef={attachmentClearerRef} />
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => (
              <PromptInputAttachment data={attachment} key={attachment.id} />
            )}
          </PromptInputAttachments>
          <PromptInputTextarea placeholder={placeholder} />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
