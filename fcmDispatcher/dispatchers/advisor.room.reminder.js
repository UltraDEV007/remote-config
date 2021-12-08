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
      attendees_aggregate {
        aggregate {
          count
        }
      }
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
      session_occurence
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

exports.effect = async ({ payload }, { ctxData, utils, helpers, clients: { sendgridClient, routeWebClient } }) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(payload, 'course.advisor_id');
  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const $start_at = moment(_.get(room, 'start_at'));
  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);
  const attend_count = _.get(ctxData, 'room.attendees_aggregate.aggregate.count', 0);

  const session_at = _.capitalize(
    $start_at
      .locale('vi')
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );

  sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: 'advisor.room.reminder',
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      start_at: session_at,
      session_count: helpers.formatSessionOccurence(session_count),
      session_duration: helpers.formatCallDuration(session_duration),
      session_at,
      attend_count: `${attend_count} học viên`,
    },
    route: {
      advisor_url: routeWebClient.getClient().toAdvisorUrl('home'),
      room_url: routeWebClient.getClient().toAdvisorUrl('room', room),
      course_url: routeWebClient.getClient().toAdvisorUrl('courseDetail', course),
    },
  });
};
