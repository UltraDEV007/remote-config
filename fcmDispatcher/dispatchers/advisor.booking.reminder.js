exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!) {
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
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'session.user_id'),
    advisor_id: _.get(payload, 'session.advisor_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment } = helpers;

  const start_at = _.get(payload, 'purchase.service_bookings.0.start_at');
  const $now = moment();
  const diffMin = moment(start_at).diff($now, 'minute');
  const advisor_id = _.get(payload, 'session.advisor_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');

  const i18n = await utils.forUser(advisor_id);

  const title = i18n.t('RemoteConfig.Booking.AdvisorBookingReminder.title', {
    user: userDisplayName,
    diffMin,
  });

  const body = i18n.t('RemoteConfig.Booking.Package', {
    package: helpers.formatCallDurationWithI18n(i18n)(duration),
    time: $start_at
      .utcOffset(await utils.getUserTimezone(advisor_id))
      .locale(i18n.locale)
      .format(helpers.START_TIME_FORMAT),
  });

  return {
    notification: {
      // title: `Your booking #${bookingId} will start in ${diffMin} minutes`,
      title,
      body,
    },
    data: {
      type: 'advisor.booking.reminder',
      purchase_id: _.get(payload, 'purchase.id'),
      service_booking_id: _.get(payload, 'purchase.service_bookings.0.id'),
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
