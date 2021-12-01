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
            }
          }
        }
      }
    }
    course: course_by_pk(id: $course_id) {
      id
      name
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

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)})`;

  const title = `Lớp học ${courseDisplayName} không diễn ra.`;
  const body = 'Bạn không nhận được học phí từ lớp học.';

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.room.refund',
      room_id: _.get(room, 'id') || '',
      course_id: _.get(course, 'id') || '',
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

exports.effect = async ({ payload }, { helpers, clients: { hasuraClient } }) => {
  const { _ } = helpers;

  const advisor_id = _.get(payload, 'course.advisor_id');

  await hasuraClient.getClient().request(
    `
    mutation upsertnotifevent($payload: jsonb, $type: String) {
      insert_notification_one(
        object: {
          owner_id: "${advisor_id}"
          type_id: $type
          payload: $payload
        }
      ) {
        id
      }
    }
  `,
    {
      type: 'advisor.room.refund',
      payload,
    }
  );
};
