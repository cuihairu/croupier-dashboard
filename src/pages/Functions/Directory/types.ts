export type I18N = { zh?: string; en?: string };
export type Menu = { nodes?: string[]; path?: string; order?: number; hidden?: boolean };

export type SummaryRow = {
  id: string;
  enabled?: boolean;
  display_name?: I18N;
  summary?: I18N;
  tags?: string[];
  menu?: Menu;
  version?: string;
  category?: string;
};

export type DetailRow = SummaryRow & {
  description?: I18N;
  author?: string;
  created_at?: string;
  updated_at?: string;
  instances?: number;
};
