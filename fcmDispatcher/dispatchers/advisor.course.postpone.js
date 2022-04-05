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
    course_id: _.get(payload, 'course.id'),
    advisor_id: _.get(payload, 'course.advisor_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const $start_at = moment(_.get(course, 'start_at'));

  const courseDisplayName = _.get(course, 'name');
  const advisor_id = _.get(ctxData, 'advisor.id');

  const i18n = await utils.forUser(advisor_id);

  const title = i18n.t('RemoteConfig.Course.AdvisorCoursePostpone.title');

  const body = i18n.t('RemoteConfig.Course.AdvisorCoursePostpone.body', {
    course: courseDisplayName,
    start_at: $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT),
  });

  return {
    notification: {
      // title: `Your booking #${bookingId} is completed`,
      title,
      body,
    },
    data: {
      type: 'advisor.course.postpone',
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

exports.effect = async (
  { payload },
  { ctxData, utils, helpers, clients: { slackClient, hasuraClient, sendgridClient, routeWebClient } }
) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(ctxData, 'advisor.id');
  const course = _.get(ctxData, 'course');
  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');
  const price_amount = _.get(course, 'price_amount');

  const old_start_time = moment(_.get(payload, 'course.old_start_time'));

  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));
  const courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);

  const i18n = await utils.forUser(advisor_id);

  const $start_at = moment(_.get(course, 'start_at'));
  const session_count = _.get(course, 'session_occurence', 0);
  const session_duration = _.get(course, 'session_duration', 0);

  const first_session_start = moment(_.get(course, 'first_room.0.start_at'));
  const first_room = _.get(course, 'first_room.0');

  const per_session = parseInt(session_count) === 100000 ? '' : `/${session_count}`;
  const payment_count = ['per_session', 'session'].includes(per_unit)
    ? i18n.t('RemoteConfig.Course.Purchase.per_session', {
        session: `${per_amount}${per_session}`,
      })
    : i18n.t('RemoteConfig.Course.Purchase.full_session_txt');
  // `${per_amount}${per_session} buổi` : 'Trọn gói';

  const title = `Khoá học "${courseDisplayName}" của ${advisorDisplayName} đã được dời lịch khai giảng.`;
  const body = `Ngày bắt đầu: ${_.capitalize(
    $start_at
      .locale('vi')
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_DAY_FULL_FORMAT)
  )}`;

  console.log('title', title, body);

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.course.postpone',
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

  // inapp noti effect
  hasuraClient.getClient().request(
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
      type: 'advisor.course.postpone',
      payload,
    }
  );

  // send email effect
  // sendgridClient.getClient().sendEmail(advisor_id, {
  //   template: {
  //     name: i18n.getTemplateSuffixName('advisor.course.postpone'),
  //   },
  //   ...i18n.getContactEmailInfo('advisor.course.postpone'),
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
  //     amount: helpers.formatCurrencySSR(price_amount),
  //     payment_count,
  //   },
  //   route: {
  //     advisor_url: routeWebClient.getClient().toAdvisorUrl('home'),
  //     course_url: routeWebClient.getClient().toAdvisorUrl('courseDetail', course),
  //     advisor_calendar_url: routeWebClient.getClient().toAdvisorUrl('calendar', course),
  //     room_url: routeWebClient.getClient().toAdvisorUrl('room', first_room),
  //     add_course_url: routeWebClient.getClient().toAdvisorUrl('addCourse'),
  //   },
  // });
};
