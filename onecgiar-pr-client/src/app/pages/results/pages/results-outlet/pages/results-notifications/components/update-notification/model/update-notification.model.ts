export type TNotificationResult = {
  notification_id: string;
  notification_level: number;
  notification_type: number;
  target_user: number;
  emitter_user: number;
  result_id: string;
  text: null;
  read: boolean;
  created_date: string;
  read_date: null;
  obj_notification_level: {
    notifications_level_id: number;
    type: string;
  };
  obj_notification_type: {
    notifications_type_id: number;
    type: string;
  };
  obj_emitter_user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  obj_target_user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  obj_result: {
    result_code: string;
    title: string;
    status_id: string;
    obj_result_by_initiatives: [
      {
        initiative_id: number;
        obj_initiative: {
          id: number;
          official_code: string;
        };
      }
    ];
    obj_version: {
      id: string;
      phase_name: string;
    };
  };
};
