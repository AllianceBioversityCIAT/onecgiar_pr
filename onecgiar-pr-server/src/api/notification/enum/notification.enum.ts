export enum NotificationLevelEnum {
  APPLICATION = 'Application',
  RESULT = 'Result',
}

export enum NotificationTypeEnum {
  RESULT_CREATED = 'Result Created',
  RESULT_SUBMITTED = 'Result Submitted',
  RESULT_UNSUBMITTED = 'Result Unsubmitted',
  RESULT_QUALITY_ASSESED = 'Result QAed',
  ANNOUNCEMENT = 'Announcement',
  BILATERAL_RESULT_APPROVED = 'Bilateral Result Approved',
  BILATERAL_RESULT_REJECTED = 'Bilateral Result Rejected',
  RESULT_CENTER_TAGGED = 'Result Center Tagged',
  RESULT_BILATERAL_PROJECT_TAGGED = 'Result Bilateral Project Tagged',
  // P2-3188. The value is the row's `type` string in `notifications_type`, which is how these are
  // resolved — the numeric ids differ between environments because they were inserted by hand.
  RESULT_CONTRIBUTION_ACCEPTED = 'Result Contribution Accepted',
  RESULT_CONTRIBUTION_DECLINED = 'Result Contribution Declined',
}
