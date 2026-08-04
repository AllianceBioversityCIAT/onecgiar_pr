export interface CustomField {
  label?: string;
  placeholder?: string;
  type?: string;
  hide?: boolean;
  description?: string;
  /**
   * P2-3201: guidance rendered behind an ⓘ icon next to the label instead of as an inline grey
   * `Description:` box. Consumed by `app-pr-field-header [tooltip]`.
   */
  tooltip?: string;
  required?: boolean;
  useColon?: boolean;
}
