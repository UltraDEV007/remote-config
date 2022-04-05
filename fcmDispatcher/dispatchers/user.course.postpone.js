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
        pricing_type
        price_amount
        price_currency
        per_amount
        per_unit
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
    user_id: _.get(payload, 'attendee_purchase.user_id'),
    course_id: _.get(payload, 'course.id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils }) => {
  const { _, moment } = helpers;
  const user_id = _.get(ctxData, 'user.id');

  const course = _.get(ctxData, 'course');
  const advisor_id = _.get(ctxData, 'advisor.id');
  const courseDisplayName = _.get(course, 'name');
  const $start_at = moment(_.get(course, 'start_at'));
  const i18n = await utils.forUser(user_id);
  const title = i18n.t('RemoteConfig.Course.UserCoursePostpone.title');

  const body = i18n.t('RemoteConfig.Course.UserCoursePostpone.body', {
    course: courseDisplayName,
    start_at: $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_DAY_FULL_FORMAT),
  });

  // const title = `Tiền hoàn khoá học ${courseDisplayName}.`;

  // const body = `Unitz đã hoàn trả lại cho bạn ${helpers.formatCurrencySSR(amount)} vào ví.`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'user.course.postpone',
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
  const { hasuraClient } = clients;

  const course = _.get(ctxData, 'course');
  const user_id = _.get(ctxData, 'user.id');

  const advisor_id = _.get(ctxData, 'advisor.id');

  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);

  const i18n = await utils.forUser(user_id);

  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');
  const per_session = parseInt(session_count) === 100000 ? '' : `/${session_count}`;
  const $start_at = moment(_.get(course, 'start_at'));

  const payment_count = ['per_session', 'session'].includes(per_unit)
    ? i18n.t('RemoteConfig.Course.Purchase.per_session', {
        session: `${per_amount}${per_session}`,
      })
    : i18n.t('RemoteConfig.Course.Purchase.full_session_txt');

  const old_start_time = moment(_.get(payload, 'course.old_start_time'));

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
      type: 'user.course.postpone',
      payload,
    }
  );

  // send email effect
  // clients.sendgridClient.getClient().sendEmail(user_id, {
  //   template: {
  //     name: i18n.getTemplateSuffixName('user.course.postpone'),
  //   },
  //   ...i18n.getContactEmailInfo('user.course.postpone'),
  //   ...ctxData,
  //   course: {
  //     ..._.pick(course, ['id', 'name']),
  //     start_at: _.capitalize(
  //       old_start_time
  //         .locale(i18n.locale)
  //         .utcOffset(await utils.getUserTimezone(advisor_id))
  //         .format(helpers.START_DAY_FULL_FORMAT)
  //     ),
  //     new_start_at: _.capitalize(
  //       $start_at
  //         .locale(i18n.locale)
  //         .utcOffset(await utils.getUserTimezone(advisor_id))
  //         .format(helpers.START_DAY_FULL_FORMAT)
  //     ),
  //     session_count: helpers.formatSessionOccurenceWithI18n(i18n)(session_count),
  //     session_duration: helpers.formatCallDurationWithI18n(i18n)(session_duration),
  //   },
  //   tuition: {
  //     payment_count,
  //   },
  //   route: {
  //     advisor_url: clients.routeWebClient.getClient().toUserUrl('advisor', _.get(ctxData, 'advisor')),
  //     user_url: clients.routeWebClient.getClient().toUserUrl('profile'),
  //     course_url: clients.routeWebClient.getClient().toUserUrl('courseDetail', course),
  //     course_filter_url: clients.routeWebClient.getClient().toUserUrl('courseFilter'),
  //     wallet_url: clients.routeWebClient.getClient().toUserUrl('userWallet'),
  //   },
  // });
};
