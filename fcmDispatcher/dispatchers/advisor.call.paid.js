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

exports.dispatch = async ({ payload }, { ctxData, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const courseDisplayName = _.get(course, 'name');

  const statements = _.get(ctxData, 'statements');
  const amount = _.get(_.find(statements, { name: 'advisor_income' }), 'amount');

  const title = `Khoá học ${courseDisplayName} đã hoàn tất`;
  const body = `Bạn nhận được ${helpers.formatCurrencySSR(amount)}`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.room.paid',
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
      },
      notification: {
        sound: 'notification',
      },
    },
  };
};

exports.effect = async ({ payload }, { ctxData, helpers, clients: { slackClient, hasuraClient } }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const courseDisplayName = _.get(course, 'name');
  const advisor_id = _.get(ctxData, 'advisor.id');

  const statements = _.get(ctxData, 'statements');
  const advisor_income = _.get(_.find(statements, { name: 'advisor_income' }), 'amount');
  const platform_income = _.get(_.find(statements, { name: 'platform_income' }), 'amount');

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
      type: 'advisor.room.paid',
      payload,
    }
  );

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được thanh toán.`;
  const body = `Income: ${helpers.formatCurrencySSR(advisor_income)} / ${helpers.formatCurrencySSR(platform_income)}`;

  console.log('title', title, body);

  await slackClient.getClient().client.chat.postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.room.paid',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: title,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: body,
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
    channel: 'C02P4M8KFBK',
  });
};
