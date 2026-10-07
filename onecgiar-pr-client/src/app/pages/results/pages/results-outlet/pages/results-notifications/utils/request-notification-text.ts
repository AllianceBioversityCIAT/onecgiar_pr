import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../internationalization/contribution-request-drawer.copy';

/**
 * @akili-spec bilateral/resubmit-followups — RSF-T-1 (RSF-R-1, RSF-R-2; DD-1, DD-2).
 * Single source of the request sentence shared by the bell's deep-link `search` text and the inbox
 * search pipe's haystack, so the link always finds its row. Primary rows get the inbox's primary
 * sentence; every other row keeps today's two strings, character for character.
 */

/** Same rule as the inbox's `creatingCenterLabel`: acronym, then name, then the fallback label. */
export const creatingCenterLabelOf = (row: any): string => {
  const center = row?.creating_center;
  const acronym = typeof center?.acronym === 'string' ? center.acronym.trim() : '';
  const name = typeof center?.name === 'string' ? center.name.trim() : '';
  return acronym || name || CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.unknownCenterFallback;
};

export const buildRequestNotificationText = (row: any): string => {
  const result = row?.obj_result;

  if (row?.request_type === 'primary') {
    const { primaryVerb, primaryTail } = CONTRIBUTION_REQUEST_DRAWER_COPY.header;
    return `${creatingCenterLabelOf(row)} ${primaryVerb} ${row?.obj_shared_inititiative?.official_code} ${primaryTail} ${result?.result_code} - ${result?.title}`;
  }

  if (row?.is_map_to_toc) {
    return `${row?.obj_requested_by?.first_name} ${row?.obj_requested_by?.last_name} from ${row?.obj_shared_inititiative?.official_code} has requested contribution to result ${result?.result_code} - ${result?.title} submitted by ${row?.obj_owner_initiative?.official_code}`;
  }

  return `${row?.obj_requested_by?.first_name} ${row?.obj_requested_by?.last_name} from ${row?.obj_owner_initiative?.official_code} has requested inclusion of ${row?.obj_shared_inititiative?.official_code} as a contributor to result ${result?.result_code} - ${result?.title}`;
};
