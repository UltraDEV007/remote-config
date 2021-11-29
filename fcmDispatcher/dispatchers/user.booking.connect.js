exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $transaction_id: uuid!) {
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
    transaction: transaction_by_pk(id: $transaction_id) {
      id
      user_id
      advisor_id
      session_id
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'session.user_id'),
    advisor_id: _.get(payload, 'session.advisor_id'),
    transaction_id: _.get(payload, 'session.transaction_id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, models, helpers }) => {
  // const { _, moment } = helpers;

  // const user_id = _.get(payload, 'session.user_id');
  // const service = _.get(payload, 'purchase.service_bookings.0');
  // const $start_at = moment(_.get(service, 'start_at'));
  // const duration = _.get(payload, 'session.session_duration');

  // const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');

  // return {
  //   notification: {
  //     title: `Đã tới giờ hẹn của bạn với ${advisorDisplayName}.`,
  //     body: `Gói ${helpers.formatCallDuration(duration)} - ${$start_at
  //       .utcOffset(await utils.getUserTimezone(user_id))
  //       .format(helpers.START_TIME_FORMAT)}`,
  //   },
  //   data: {
  //     type: 'user.booking.connect',
  //     purchase_id: _.get(payload, 'purchase.id'),
  //     service_booking_id: _.get(payload, 'purchase.service_bookings.0.id'),
  //   },
  // };

  const { _ } = helpers;
  const { VideoRoomModel } = models;

  const session = _.get(payload, 'session');
  const user_id = _.get(payload, 'session.user_id');
  const advisor_id = _.get(payload, 'session.advisor_id');
  const service = _.get(payload, 'purchase.service_bookings.0.service');

  const userDisplayName = _.get(ctxData, 'advisor.profile.display_name');

  const transaction = _.get(ctxData, 'transaction');
  const user = _.get(ctxData, 'user');
  const advisor = _.get(ctxData, 'advisor');

  const title = [
    `${userDisplayName}`,
    `${_.upperFirst(_.get(service, 'service.kind'))} ${Math.round(_.get(service, 'per_amount') / 60)}min`,
  ].join('-');

  const body = [
    `${userDisplayName}`,
    `${_.upperFirst(_.get(service, 'service.kind'))} ${Math.round(_.get(service, 'per_amount') / 60)}min`,
  ].join('-');

  const videoCalModel = new VideoRoomModel();
  await videoCalModel.joinBooking({
    user,
    advisor,
    transaction,
    service,
  });

  const notifSessionObject = {
    user_id,
    advisor_id,
    ...(await videoCalModel.getNotifSessionObject()),
    ..._.pick(session, ['kind', 'session_duration']),
    start_at: _.get(payload, 'purchase.service_bookings.0.start_at'),
    purchase_id: _.get(payload, 'purchase.id'),
    service_booking_id: _.get(payload, 'purchase.service_bookings.0.id'),
  };

  return {
    data: {
      ...notifSessionObject,
      type: 'user.booking.connect',
    },
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      ttl: 3000,
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
        },
      },
      headers: {
        'apns-push-type': 'background',
        'apns-priority': '5',
        'apns-topic': 'app.unitz.user', // your app bundle identifier
      },
    },
  };
};
