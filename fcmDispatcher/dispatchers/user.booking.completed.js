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
  const user_id = _.get(payload, 'session.user_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');

  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');

  const i18n = await utils.forUser(user_id);

  const title = i18n.t('RemoteConfig.Booking.UserBookingCompleted.title', {
    advisor: advisorDisplayName,
  });

  const body = i18n.t('RemoteConfig.Booking.Package', {
    package: helpers.formatCallDurationWithI18n(i18n)(duration),
    time: $start_at
      .utcOffset(await utils.getUserTimezone(user_id))
      .locale(i18n.locale)
      .format(helpers.START_TIME_FORMAT),
  });

  return {
    notification: {
      // title: `Your booking #${bookingId} is completed`,
      title,
      body,
    },
    data: {
      type: 'user.booking.completed',
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
