exports.getQuery = () => `
  query(
    $user_id: String!,
    $advisor_id: String!,
    $room_id: uuid!,
    $course_id: uuid!,
    $attendee_purchase_id: uuid!,
  ) {
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
      }
    }
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
      purchases(where: { id: {_eq: $attendee_purchase_id}}) {
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
      start_at
      session_duration
      sessions {
        id
        is_active
      }
      per_amount
      per_unit
      purchases(where: {purchase: {user_id: {_eq: $user_id}}}) {
        id
        price_amount
        is_active
        purchase {
          statement {
            amount
            id
          }
          user_id
        }
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'attendee_purchase.user_id'),
    attendee_purchase_id: _.get(payload, 'attendee_purchase.id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
    course_id: _.get(payload, 'course.id'),
    room_id: _.get(payload, 'room.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)})`;

  const statements = helpers.flattenGet(room, 'purchases.purchase.transaction_purchase.transaction.statement');

  const amount = _.get(_.find(statements, { name: 'refund' }), 'amount');

  const title = `Lớp học ${courseDisplayName} không diễn ra.`;
  const body = `Unitz đã hoàn trả lại cho bạn ${helpers.formatCurrencySSR(amount)} vào ví.`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'user.room.refund',
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

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients }) => {
  const { _, moment } = helpers;
  const { slackClient, hasuraClient } = clients;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)})`;
  const session_at = _.capitalize(
    $start_at
      .locale('vi')
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );
  const session_count = _.get(ctxData, 'course.sessions.length', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);

  const per_unit = _.get(course, 'per_unit');
  const payment_count = per_unit === 'per_session' ? _.get(course, 'purchases.length') : 'Trọn gói';

  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const user_id = _.get(ctxData, 'user.id');

  const statements = helpers.flattenGet(room, 'purchases.purchase.transaction_purchase.transaction.statement');

  const amount = _.get(_.find(statements, { name: 'refund' }), 'amount');

  await hasuraClient.getClient().request(
    `
    mutation upsertnotifevent($payload: jsonb, $type: String) {
      insert_notification_one(
        object: {
          owner_id: "${user_id}"
          type_id: $type
          payload: $payload
        }
      ) {
        id
      }
    }
  `,
    {
      type: 'user.room.refund',
      payload,
    }
  );

  const title = `Lớp học "${courseDisplayName}" của ${advisorDisplayName} đã được hoàn tiền.`;
  const body = `Refund: ${helpers.formatCurrencySSR(amount)}`;

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'user.room.refund',
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

  // send email effect
  clients.sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: 'user.room.refund',
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      session_at,
      session_count,
      session_duration: helpers.formatCallDuration(session_duration),
    },
    tuition: {
      payment_count,
    },
  });
};
