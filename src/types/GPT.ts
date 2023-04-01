export type GPTChatMessageTemplateKeys =
  | "ai_name"
  | "user_name"
  | "world"
  | "class"
  | "personality"
  | "local"
  | "subject"
  | "text";

export type GPTChatMessageTemplate = {
  [K in GPTChatMessageTemplateKeys]: string;
};

export type GPTChatOptions = {
  debug?: boolean;
  templateName: string;
  templateValues: GPTChatMessageTemplate;
  tokenLimit: number;
};
