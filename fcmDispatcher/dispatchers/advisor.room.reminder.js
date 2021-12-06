exports.getQuery = () => `
  query($advisor_id: String!, $room_id: uuid!, $course_id: uuid!) {
    advisor: advisor_by_pk(id: $advisor_id) {
      id
      profile {
        display_name
      }
    }
    room: course_room_by_pk(id: $room_id) {
      id
      start_at
      end_at
      course_session_id
      purchases {
        id
        user_id
        purchase_id
        purchase {
          transaction_purchase {
            transaction {
              statement {
                id
                name
                type
                amount
              }
              session_id
            }
          }
        }
      }
    }
    course: course_by_pk(id: $course_id) {
      id
      name
      start_at
      session_duration
      sessions {
        id
        is_active
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    advisor_id: _.get(payload, 'course.advisor_id'),
    course_id: _.get(payload, 'course.id'),
    room_id: _.get(payload, 'room.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils, clients: { routeWebClient } }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const start_at = _.get(ctxData, 'room.start_at');
  const $now = moment();
  const diffMin = moment(start_at).diff($now, 'minute');
  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)})`;

  const title = `Lớp học ${courseDisplayName}`;
  const body = `Sẽ bắt đầu sau ${diffMin} phút.`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.room.reminder',
      room_id: _.get(room, 'id') || '',
      course_id: _.get(course, 'id') || '',
      room_url: routeWebClient.getClient().toAdvisorUrl('room', room),
      sound: 'sound1',
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'notification.mp3',
        },
      },
    },
    android: {
      priority: 'high',
      data: {
        sound: 'notification',
        channelId: 'unitz-notifee-video-channel-2',
      },
      notification: {
        sound: 'notification',
        channelId: 'unitz-notifee-video-channel-2',
      },
    },
  };
};

exports.effect = async ({ payload }, { ctxData, utils, helpers, clients: { sendgridClient } }) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(payload, 'course.advisor_id');
  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const $start_at = moment(_.get(course, 'start_at'));
  const session_count = _.get(ctxData, 'course.sessions.length', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);
  const course_sessions = _.get(ctxData, 'course.sessions', []);
  const current_session = _.get(room, 'course_session_id', '');
  const session_at = _.findIndex(course_sessions, (item) => _.get(item, 'id') === current_session);

  sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: 'advisor.room.reminder',
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      start_at: $start_at.utcOffset(await utils.getUserTimezone(advisor_id)).format(helpers.START_TIME_FORMAT),
      session_count,
      session_duration: helpers.formatCallDuration(session_duration),
      session_at: session_at >= 0 ? session_at + 1 : session_at,
    },
  });
};
