export interface User {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  preferences: UserPreferences | null;
  created_at: string;
}

export interface UserPreferences {
  default_view_mode: "list" | "grid" | "compact";
  default_scope: "all" | "mine" | "public";
}

export interface AppSettings {
  allow_registration: boolean;
  default_prompt_visibility: "private" | "public";
  environment: string;
}

export interface Settings {
  preferences: UserPreferences;
  default_prompt_visibility: "private" | "public";
  app: AppSettings | null;
}

export interface UserAdmin {
  id: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  prompt_count: number;
}

export interface PublicSettings {
  allow_registration: boolean;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string | null;
  model: string;
  task: string;
  visibility: "private" | "public";
  tags: string | null;
  owner_id: string;
  owner_username: string | null;
  copy_count: number;
  created_at: string;
  updated_at: string;
}

export interface TopCopiedPrompt {
  id: string;
  title: string;
  model: string;
  task: string;
  owner_username: string | null;
  copy_count: number;
  created_at: string;
}

export interface NewPromptsPoint {
  date: string;
  count: number;
}

export interface Stats {
  total_public_prompts: number;
  total_copies: number;
  new_last_7_days: number;
  new_last_30_days: number;
  most_copied: TopCopiedPrompt[];
  new_prompts_by_day: NewPromptsPoint[];
}

export interface RuleHint {
  id: string;
  label: string;
}

export interface TaskOption {
  value: string;
  label: string;
}

export interface Meta {
  version: string;
  models: string[];
  tasks: TaskOption[];
  password_rules: RuleHint[];
  username_rules: RuleHint[];
}

export interface PromptInput {
  title: string;
  content: string;
  description?: string;
  model: string;
  task: string;
  visibility: "private" | "public";
  tags?: string;
}
