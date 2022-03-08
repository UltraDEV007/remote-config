exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $course_id: uuid!) {
    advisor: advisor_by_pk(id: $advisor_id) {
      id
      profile {
        display_name
      }
    }
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
      }
    }
    course: course_by_pk(id: $course_id) {
        advisor_id
        type
        pricing_type
        price_amount
        price_currency
        per_amount
        per_unit
        id
        name
        description
        start_at
        session_duration
        session_occurence
        sessions {
            id
            is_active
        }
        first_room: rooms(order_by: {start_at: asc}, limit: 1) {
            start_at
            id
        }
            
        enrolls {
            user_id
            course_id
            user {
                id
            profile {
                    display_name
                    id
                    avatar_url
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
    user_id: _.get(payload, 'user_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _ } = helpers;

  const course = _.get(ctxData, 'course');
  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');
  const price_amount = _.get(course, 'price_amount');
  const price_currency = _.get(course, 'price_currency');

  const user = _.get(ctxData, 'user');

  const userDisplayName = _.get(user, 'profile.display_name');
  const courseDisplayName = _.get(course, 'name');
  const advisor_id = _.get(ctxData, 'advisor.id');

  const i18n = await utils.forUser(advisor_id);

  // const title = 'Thông báo huỷ khoá học';

  const title = i18n.t('RemoteConfig.TrialCourse.AdvisorTrialCourseRequest.title');

  // const body = `${userDisplayName} huỷ đăng ký khoá học ${courseDisplayName}.`;

  const body = i18n.t('RemoteConfig.TrialCourse.AdvisorTrialCourseRequest.body', {
    user: userDisplayName,
  });

  return {
    notification: {
      // title: `Your booking #${bookingId} is completed`,
      title,
      body,
    },
    data: {
      type: 'advisor.trialCourse.requested',
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
  const price_currency = _.get(course, 'price_currency');

  const user = _.get(ctxData, 'user');

  // const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  // const userDisplayName = _.get(ctxData, 'user.profile.display_name');
  // const courseDisplayName = _.get(course, 'name');

  const i18n = await utils.forUser(advisor_id);

  const $start_at = moment(_.get(course, 'start_at'));
  const session_count = _.get(course, 'session_occurence', 0);
  const session_duration = _.get(course, 'session_duration', 0);

  const first_session_start = moment(_.get(course, 'first_room.0.start_at'));
  const first_room = _.get(course, 'first_room.0');

  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));
  const userDisplayName = routeWebClient.getClient().toAdminLink('admin.user', user);
  const courseDisplayName = routeWebClient.getClient().toAdminLink('admin.course', course);

  const title = `${userDisplayName} đã yêu cầu học thử khoá "${courseDisplayName}" của ${advisorDisplayName}.`;
  const body = ['per_session', 'session'].includes(per_unit) ? `${per_amount} buổi: Miễn phí` : 'Trọn gói: Miễn phí';

  slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.trialCourse.requested',
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

  //   inapp noti effect
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
      type: 'advisor.trialCourse.requested',
      payload,
    }
  );

  sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: i18n.getTemplateSuffixName('advisor.trialCourse.requested'),
    },
    ...i18n.getContactEmailInfo('advisor.trialCourse.requested'),
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      session_at: _.capitalize(
        first_session_start
          .locale(i18n.locale)
          .utcOffset(await utils.getUserTimezone(advisor_id))
          .format(helpers.START_TIME_FULL_FORMAT)
      ),
      session_count: helpers.formatSessionOccurenceWithI18n(i18n)(session_count),
      session_duration: helpers.formatCallDurationWithI18n(i18n)(session_duration),
    },

    route: {
      advisor_url: routeWebClient.getClient().toAdvisorUrl('home'),
      course_url: routeWebClient.getClient().toAdvisorUrl('courseDetail', course),
      advisor_calendar_url: routeWebClient.getClient().toAdvisorUrl('calendar', course),
      room_url: routeWebClient.getClient().toAdvisorUrl('room', first_room),
      add_course_url: routeWebClient.getClient().toAdvisorUrl('addCourse'),
      course_activity_url: routeWebClient
        .getClient()
        .toAdvisorUrl('courseDetail', { ...(course || {}), tab: 'activity' }),
    },
  });
};
