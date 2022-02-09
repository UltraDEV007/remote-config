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
      course_session_id
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

exports.dispatch = async ({ payload }, { ctxData, helpers, utils, clients: { routeWebClient } }) => {
  const { _, moment } = helpers;

  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const start_at = _.get(ctxData, 'room.start_at');
  const end_at = _.get(ctxData, 'room.end_at');
  const duration = moment(end_at).diff(moment(start_at), 'second');
  const $start_at = moment(_.get(room, 'start_at'));
  const advisor_id = _.get(ctxData, 'advisor.id');

  const i18n = await utils.forUser(advisor_id);

  const courseDisplayName = `${_.get(course, 'name')}(${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .locale(i18n.locale)
    .format(helpers.START_TIME_FORMAT)})`;

  const title = i18n.t('RemoteConfig.Room.AdvisorRoomConnect.title', {
    course: courseDisplayName,
  });

  const body = i18n.t('RemoteConfig.Room.AdvisorRoomConnect.body', {
    duration: helpers.formatCallDurationWithI18n(i18n)(duration),
  });

  // const title = `Lớp học ${courseDisplayName}`;
  // const body = `Đã bắt đầu - Thời lượng ${helpers.formatCallDuration(duration)}.`;

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.room.connect',
      room_id: _.get(room, 'id') || '',
      course_id: _.get(course, 'id') || '',
      room_url: routeWebClient.getClient().toAdvisorUrl('room', room),
      sound: 'sound1',
    },
    // android: {
    //   priority: 'high',
    //   ttl: 3000,
    // },
    // apns: {
    //   payload: {
    //     aps: {
    //       contentAvailable: true,
    //     },
    //   },
    //   headers: {
    //     'apns-push-type': 'background',
    //     'apns-priority': '5',
    //     'apns-topic': 'app.unitz.advisor', // your app bundle identifier
    //   },
    // },
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

exports.effect = async ({ payload }, { ctxData, utils, helpers, clients: { sendgridClient, routeWebClient } }) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(payload, 'course.advisor_id');
  const course = _.get(ctxData, 'course');
  const room = _.get(ctxData, 'room');
  const $start_at = moment(_.get(room, 'start_at'));
  const session_count = _.get(ctxData, 'course.session_occurence', 0);
  const session_duration = _.get(ctxData, 'course.session_duration', 0);
  const i18n = await utils.forUser(advisor_id);

  const session_at = _.capitalize(
    $start_at
      .locale(i18n.locale)
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .format(helpers.START_TIME_FULL_FORMAT)
  );

  sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: i18n.getTemplateSuffixName('advisor.room.connect'),
    },
    ...ctxData,
    course: {
      ..._.pick(course, ['id', 'name']),
      start_at: session_at,
      session_count: helpers.formatSessionOccurenceWithI18n(i18n)(session_count),
      session_duration: helpers.formatCallDurationWithI18n(i18n)(session_duration),
      session_at,
    },
    route: {
      advisor_url: routeWebClient.getClient().toAdvisorUrl('home'),
      room_url: routeWebClient.getClient().toAdvisorUrl('room', room),
      course_url: routeWebClient.getClient().toAdvisorUrl('courseDetail', course),
    },
  });
};
