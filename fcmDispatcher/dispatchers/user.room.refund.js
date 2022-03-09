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
          transaction_purchases {
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
      session_occurence
      sessions {
        id
        is_active
      }
      per_amount
      per_unit
      purchases(where: {purchase: {user_id: {_eq: $user_id}, status_latest: {status: {_eq: "completed"}}}}) {
        id
        price_amount
        per_amount
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
  const user_id = _.get(ctxData, 'user.id');

  const i18n = await utils.forUser(user_id);

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .locale(i18n.locale)
    .format(helpers.START_TIME_FORMAT)})`;

  const statements = helpers.flattenGet(room, 'purchases.purchase.transaction_purchases.transaction.statement');

  const amount = _.get(_.find(statements, { name: 'refund' }), 'amount');

  // const title = `Lớp học ${courseDisplayName} không diễn ra.`;
  const title = i18n.t('RemoteConfig.Room.UserRoomRefund.title', {
    course: courseDisplayName,
  });
  // const body = `Unitz đã hoàn trả lại cho bạn ${helpers.formatCurrencySSR(amount)} vào ví.`;
  const body = i18n.t('RemoteConfig.Room.UserRoomRefund.body', {
    amount: helpers.formatCurrencySSR(amount),
  });

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
  const { slackClient, hasuraClient, routeWebClient } = clients;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');
  const user_id = _.get(ctxData, 'user.id');

  const i18n = await utils.forUser(user_id);

  let courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);
  courseDisplayName = `${courseDisplayName}(<${routeWebClient
    .getClient()
    .toAdminLink('admin.room', room)} | ${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)}>)`;
  const session_at = _.capitalize(
    $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );
  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);

  const per_unit = _.get(course, 'per_unit');
  // const per_amount = _.get(course, 'per_amount');
  const per_amount = _.sumBy(_.get(course, 'purchases'), 'per_amount');
  const per_session = parseInt(session_count) === 100000 ? '' : `/${session_count}`;
  // const payment_count = ['per_session', 'session'].includes(per_unit) ? `${per_amount}${per_session} buổi` : 'Trọn gói';

  const payment_count = ['per_session', 'session'].includes(per_unit)
    ? i18n.t('RemoteConfig.Course.Purchase.per_session', {
        session: `${per_amount}${per_session}`,
      })
    : i18n.t('RemoteConfig.Course.Purchase.full_session_txt');

  // const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));

  const statements = helpers.flattenGet(room, 'purchases.purchase.transaction_purchases.transaction.statement');

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
    // channel: 'C02P4M8KFBK',
  });

  // send email effect
  clients.sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: i18n.getTemplateSuffixName('user.room.refund'),
    },
    ...i18n.getContactEmailInfo('user.room.refund'),
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      session_at,
      session_count: helpers.formatSessionOccurenceWithI18n(i18n)(session_count),
      session_duration: helpers.formatCallDurationWithI18n(i18n)(session_duration),
    },
    tuition: {
      payment_count,
    },
    route: {
      advisor_url: clients.routeWebClient.getClient().toUserUrl('advisor', _.get(ctxData, 'advisor')),
      user_url: clients.routeWebClient.getClient().toUserUrl('profile'),
      course_url: clients.routeWebClient.getClient().toUserUrl('courseDetail', course),
      course_filter_url: clients.routeWebClient.getClient().toUserUrl('courseFilter'),
      room_url: clients.routeWebClient.getClient().toUserUrl('room', room),
      wallet_url: clients.routeWebClient.getClient().toUserUrl('userWallet'),
    },
  });
};
