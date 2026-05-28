export interface User {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
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
  created_at: string;
  updated_at: string;
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
