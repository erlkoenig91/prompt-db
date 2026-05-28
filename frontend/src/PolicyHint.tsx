import type { RuleHint } from "./types";

export function checkPasswordRule(id: string, password: string): boolean {
  switch (id) {
    case "length":
      return password.length >= 12;
    case "uppercase":
      return /[A-Z]/.test(password);
    case "lowercase":
      return /[a-z]/.test(password);
    case "digit":
      return /\d/.test(password);
    default:
      return true;
  }
}

export function checkUsernameRule(id: string, username: string): boolean {
  switch (id) {
    case "length":
      return username.length >= 3 && username.length <= 64;
    case "charset":
      return /^[a-zA-Z0-9_-]+$/.test(username);
    default:
      return true;
  }
}

export function allRulesMet(rules: RuleHint[], value: string, checker: (id: string, value: string) => boolean) {
  return rules.every((rule) => checker(rule.id, value));
}

interface PolicyHintProps {
  title: string;
  rules: RuleHint[];
  value: string;
  check: (id: string, value: string) => boolean;
}

export function PolicyHint({ title, rules, value, check }: PolicyHintProps) {
  return (
    <div className="policy-hint">
      <p className="policy-title">{title}</p>
      <ul>
        {rules.map((rule) => {
          const ok = value.length > 0 && check(rule.id, value);
          const pending = value.length === 0;
          return (
            <li key={rule.id} className={pending ? "pending" : ok ? "ok" : "fail"}>
              <span className="policy-icon" aria-hidden="true">
                {pending ? "○" : ok ? "✓" : "✗"}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
