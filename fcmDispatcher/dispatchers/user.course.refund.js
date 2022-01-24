exports.getQuery = () => `
  query(
    $user_id: String!,
    $advisor_id: String!,
    $course_id: uuid!,
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
      pricing_type
      price_amount
      price_currency
      per_amount
      per_unit
      first_room: rooms(where: {course_room_attendees: {user_id: {_eq: "$user_id"}}}, order_by: {start_at: asc}, limit: 1) {
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
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'attendee_purchase.user_id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
    course_id: _.get(payload, 'course.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const advisor_id = _.get(ctxData, 'advisor.id');
  const courseDisplayName = _.get(course, 'name');
  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');
  const price_amount = _.get(course, 'price_amount');
  const price_currency = _.get(course, 'price_currency');

  const amount = helpers.formatCurrencySSR(price_amount, price_currency);
  const title = `Tiền hoàn khoá học ${courseDisplayName}.`;
  const body = `Unitz đã hoàn trả lại cho bạn ${helpers.formatCurrencySSR(amount)} vào ví.`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'user.course.refund',
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
  const { slackClient, hasuraClient, routeWebClient } = clients;

  const course = _.get(ctxData, 'course');

  const advisor_id = _.get(ctxData, 'advisor.id');

  // const courseDisplayName = _.get(course, 'name');
  const courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);

  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);

  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');
  const per_session = parseInt(session_count) === 100000 ? '' : `/${session_count}`;
  const payment_count = ['per_session', 'session'].includes(per_unit) ? `${per_amount}${per_session} buổi` : 'Trọn gói';

  const first_session_start = moment(_.get(ctxData, 'course.first_room.0.start_at'));

  // const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));

  const user_id = _.get(ctxData, 'user.id');

  const price_amount = _.get(course, 'price_amount');
  const price_currency = _.get(course, 'price_currency');

  const purchases = helpers.flattenGet(course, 'purchases');
  const amount = _.sumBy(purchases, 'price_amount');

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
      type: 'user.course.refund',
      payload,
    }
  );

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được hoàn tiền.`;
  const body = `Refund: ${helpers.formatCurrencySSR(amount)}`;

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'user.course.refund',
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
    // channel: 'C02P4M8KFBK',
  });

  // send email effect
  clients.sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: 'user.course.refund',
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
      session_count: helpers.formatSessionOccurence(session_count),
      session_duration: helpers.formatCallDuration(session_duration),
    },
    tuition: {
      payment_count,
    },
    route: {
      advisor_url: clients.routeWebClient.getClient().toUserUrl('advisor', _.get(ctxData, 'advisor')),
      user_url: clients.routeWebClient.getClient().toUserUrl('profile'),
      course_url: clients.routeWebClient.getClient().toUserUrl('courseDetail', course),
      course_filter_url: clients.routeWebClient.getClient().toUserUrl('courseFilter'),
      wallet_url: clients.routeWebClient.getClient().toUserUrl('userWallet'),
    },
  });
};
