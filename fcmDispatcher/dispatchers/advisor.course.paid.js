exports.getQuery = () => `
  query($advisor_id: String!, $course_id: uuid!) {
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
      first_room: rooms(order_by: {start_at: asc}, limit: 1) {
        start_at
      }
      purchases {
        purchase {
          transaction_purchases {
            transaction {
              statement {
                id
                name
                type
                amount
              }
              user {
                profile {
                  display_name
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    advisor_id: _.get(payload, 'course.advisor_id'),
    course_id: _.get(payload, 'course.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');

  const courseDisplayName = _.get(course, 'name');

  const statements = helpers.flattenGet(course, 'purchases.purchase.transaction_purchases.transaction.statement');

  const amount = _.sumBy(_.filter(statements, { name: 'advisor_income' }), 'amount');
  const advisor_id = _.get(ctxData, 'advisor.id');

  const i18n = await utils.forUser(advisor_id);

  const title = i18n.t('RemoteConfig.Course.AdvisorCoursePaid.title', {
    course: courseDisplayName,
  });

  // const title = `Khoá học ${courseDisplayName} đã hoàn tất`;
  // const body = `Bạn nhận được ${helpers.formatCurrencySSR(amount)}`;

  const body = i18n.t('RemoteConfig.Course.AdvisorCoursePaid.body', {
    amount: helpers.formatCurrencySSR(amount),
  });

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.course.paid',
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

exports.effect = async ({ payload }, { ctxData, utils, helpers, clients }) => {
  const { _, moment } = helpers;
  const { slackClient, hasuraClient, routeWebClient } = clients;

  const course = _.get(ctxData, 'course');

  // const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));

  // const courseDisplayName = _.get(course, 'name');
  const courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);
  const advisor_id = _.get(ctxData, 'advisor.id');

  const statements = helpers.flattenGet(course, 'purchases.purchase.transaction_purchases.transaction.statement');
  const advisor_income = _.sumBy(_.filter(statements, { name: 'advisor_income' }), 'amount');
  const platform_income = _.sumBy(_.filter(statements, { name: 'platform_income' }), 'amount');
  const users = helpers.flattenGet(course, 'purchases.purchase.transaction_purchases.transaction.user');
  const $start_at = moment(_.get(course, 'start_at'));
  const session_count = _.get(course, 'session_occurence', 0);
  const session_duration = _.get(course, 'session_duration', 0);
  const first_session_start = moment(_.get(course, 'first_room.0.start_at'));
  const i18n = await utils.forUser(advisor_id);

  const session_at = _.capitalize(
    $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );

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
      type: 'advisor.course.paid',
      payload,
    }
  );

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được thanh toán.`;
  const body = `Income: ${helpers.formatCurrencySSR(advisor_income)} / ${helpers.formatCurrencySSR(platform_income)}`;

  console.log('title', title, body);

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.course.paid',
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
  clients.sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: i18n.getTemplateSuffixName('advisor.course.paid'),
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      first_session_start: _.capitalize(
        first_session_start
          .locale(i18n.locale)
          .utcOffset(await utils.getUserTimezone(advisor_id))
          .format(helpers.START_TIME_FULL_FORMAT)
      ),
      start_at: session_at,
      session_count: helpers.formatSessionOccurenceWithI18n(i18n)(session_count),
      session_duration: helpers.formatCallDurationWithI18n(i18n)(session_duration),
    },
    tuition: {
      amount: helpers.formatCurrencySSR(advisor_income),
      pay_from: _.map(users, (user) => _.get(user, 'profile.display_name')).join(','),
    },
    route: {
      advisor_url: clients.routeWebClient.getClient().toAdvisorUrl('home'),
      course_url: clients.routeWebClient.getClient().toAdvisorUrl('courseDetail', course),
      add_course_url: clients.routeWebClient.getClient().toAdvisorUrl('addCourse'),
      advisor_wallet_url: clients.routeWebClient.getClient().toAdvisorUrl('wallet'),
    },
  });
};
