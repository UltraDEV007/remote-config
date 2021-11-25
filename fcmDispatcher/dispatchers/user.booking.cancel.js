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

exports.dispatch = async ({ payload }, { ctxData, utils, helpers, clients: { hasuraClient } }) => {
  const { _, moment } = helpers;

  const user_id = _.get(payload, 'session.user_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');

  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');

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
      type: 'user.booking.cancel',
      payload,
    }
  );

  return {
    notification: {
      title: `Lịch hẹn với ${advisorDisplayName} đã bị huỷ.`,
      body: `Gói ${helpers.formatCallDuration(duration)} - ${$start_at
        .utcOffset(await utils.getUserTimezone(user_id))
        .format(helpers.START_TIME_FORMAT)}`,
    },
    data: {
      type: 'user.booking.cancel',
      purchase_id: _.get(payload, 'purchase.id'),
      service_booking_id: _.get(payload, 'purchase.service_bookings.0.id'),
    },
  };
};
