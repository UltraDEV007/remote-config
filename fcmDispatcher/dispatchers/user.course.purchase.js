exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $purchase_id: uuid!) {
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
    purchase: purchase_by_pk(id: $purchase_id) {
      course_rooms {
        id
      }
      courses {
        pricing_type
        price_amount
        price_currency
        per_amount
        per_unit
        course {
          id
          name
          description
          start_at
          session_duration
          sessions {
            id
            is_active
          }
          first_room: rooms(order_by: {start_at: asc}, limit: 1) {
            start_at
          }
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
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'purchase.user_id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
    purchase_id: _.get(payload, 'purchase.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'purchase.courses.0.course');
  const per_unit = _.get(ctxData, 'purchase.courses.0.per_unit');
  const per_amount = _.get(ctxData, 'purchase.courses.0.per_amount');
  const price_amount = _.get(ctxData, 'purchase.courses.0.price_amount');
  const price_currency = _.get(ctxData, 'purchase.courses.0.price_currency');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');
  const courseDisplayName = _.get(course, 'name');

  const title = `Bạn đã mua khoá học ${courseDisplayName}.`;
  const body =
    per_unit === 'per_session'
      ? `Thanh toán ${helpers.formatCurrencySSR(price_amount, price_currency)} cho ${per_amount} buổi`
      : `Trọn gói: ${helpers.formatCurrencySSR(price_amount, price_currency)}`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'user.course.purchase',
      purchase_id: _.get(payload, 'purchase.id'),
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

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients: { hasuraClient, sendgridClient } }) => {
  const { _, moment } = helpers;

  const user_id = _.get(ctxData, 'user.id');
  const course = _.get(ctxData, 'purchase.courses.0.course');
  const session_count = _.get(course, 'sessions.length', 0);
  const session_duration = _.get(course, 'session_duration', 0);
  const first_session_start = moment(_.get(course, 'first_room.0.start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const per_unit = _.get(ctxData, 'purchase.courses.0.per_unit');
  const per_amount = _.get(ctxData, 'purchase.courses.0.per_amount');

  const payment_count = per_unit === 'per_session' ? _.get(course, 'purchases.length') : 'Trọn gói';

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
      type: 'user.course.purchase',
      payload,
    }
  );

  // send email effect
  sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: 'user.course.purchase',
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      first_session_start: _.capitalize(
        first_session_start
          .locale('vi')
          .utcOffset(await utils.getUserTimezone(advisor_id))
          .format(helpers.START_TIME_FULL_FORMAT)
      ),

      session_count,
      session_duration: helpers.formatCallDuration(session_duration),
    },
    tuition: {
      payment_count,
    },
  });
};
