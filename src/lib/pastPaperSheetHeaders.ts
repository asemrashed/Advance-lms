/**
 * Canonical column layout for Platform QB sheet import
 * (`0606_QuestionDatabase_MASTER.xlsx` / Google Sheets / CSV).
 * Kept free of `xlsx` so client components can import safely.
 */
export const MASTER_SHEET_HEADERS = [
  "QID",
  "Subject",
  "Year",
  "Session",
  "Paper",
  "Question_Number",
  "Question_Text",
  "Marks",
  "Topic_ID",
  "Topic_Name",
  "Subtopic",
  "Difficulty",
  "Calculator_Type",
  "Has_Diagram",
  "Diagram_Status",
  "Has_MS_Diagram",
  "MS_Diagram_Status",
  "MS_Text",
  "AI_Confidence",
  "Tag_Verified",
  "Status",
  "Notes",
] as const;

/** Build a blank CSV template matching the master sheet columns. */
export function buildMasterTemplateCsv(): string {
  return `${MASTER_SHEET_HEADERS.join(",")}\n`;
}
