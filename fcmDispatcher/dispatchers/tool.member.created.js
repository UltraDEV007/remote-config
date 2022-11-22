exports.getQuery = () => `
  query($user_id: String!) {
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'purchase.user_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, helpers, utils, clients: { routeWebClient } }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const start_at = _.get(ctxData, 'room.start_at');
  const $now = moment();
  const diffMin = moment(start_at).diff($now, 'minute');
  const user_id = _.get(ctxData, 'user.id');
  const i18n = await utils.forUser(user_id);

  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(user_id))
    .locale(i18n.locale)
    .format(helpers.START_TIME_FORMAT)})`;

  // const title = `Thay đổi giờ học lớp ${courseDisplayName}`;
  const title = i18n.t('RemoteConfig.Room.UserRoomReschedule.title', {
    course: courseDisplayName,
  });

  const body = i18n.t('RemoteConfig.Room.UserRoomReschedule.body', {
    time: $start_at
      .utcOffset(await utils.getUserTimezone(user_id))
      .locale(i18n.locale)
      .format(helpers.START_TIME_FORMAT),
  });

  const rtn = {
    notification: {
      title,
      body,
    },
    data: {
      type: 'tool.member.created',
      room_id: _.get(room, 'id') || '',
      course_id: _.get(course, 'id') || '',
      room_url: routeWebClient.getClient().toUserUrl('room', room),
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
  console.log('rtnrtnrtnrtn', rtn);
};

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');

  const $start_at = moment(_.get(room, 'start_at'));

  const user_id = _.get(ctxData, 'user.id');
  const i18n = await utils.forUser(user_id);

  const session_at = _.capitalize(
    $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(user_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );

  const last_edit_time = moment(_.get(room, 'last_edit.0.start_at'));

  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);

  const per_unit = _.get(course, 'per_unit');
  const per_amount = _.get(course, 'per_amount');

  const per_session = parseInt(session_count) === 100000 ? '' : `/${session_count}`;

  const payment_count = ['per_session', 'session'].includes(per_unit)
    ? i18n.t('RemoteConfig.Course.Purchase.per_session', {
        session: `${per_amount}${per_session}`,
      })
    : i18n.t('RemoteConfig.Course.Purchase.full_session_txt');

  // await clients.hasuraClient.getClient().request(
  //   `
  //   mutation upsertnotifevent($payload: jsonb, $type: String) {
  //     insert_notification_one(
  //       object: {
  //         owner_id: "${user_id}"
  //         type_id: $type
  //         payload: $payload
  //       }
  //     ) {
  //       id
  //     }
  //   }
  // `,
  //   {
  //     type: 'tool.member.created',
  //     payload,
  //   }
  // );

  // send email effect
  clients.sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: i18n.getTemplateSuffixName('tool.member.created'),
    },
    ...i18n.getContactEmailInfo('tool.member.created'),
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      reschedule_time: session_at,
      last_edit_time: _.capitalize(
        last_edit_time
          .locale(i18n.locale)
          .utcOffset(await utils.getUserTimezone(user_id))
          .format(helpers.START_TIME_FULL_FORMAT)
      ),
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
    },
  });
};
