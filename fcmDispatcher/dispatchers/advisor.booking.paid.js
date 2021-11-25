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

exports.dispatch = async ({ payload }, { ctxData, utils, helpers, hasuraClient }) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(payload, 'session.advisor_id');
  const transaction_id = _.get(payload, 'session.transaction_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');
  const kind = _.get(payload, 'session.kind');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');

  // query transaction info
  const transaction_statement_res = await hasuraClient.getClient().request(
    `
    query transaction_statement($payload: jsonb, $type: String) {
      transaction_statement(
        where: {
          transaction_id: { _eq: "${transaction_id}"}
          name: { _eq: "advisor_income"}
        }
      ) {
        amount
      }
    }
  `,
    {}
  );
  const amount = _.get(transaction_statement_res, 'transaction_statement.0.amount');

  console.log('amount', amount);

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
      type: 'advisor.booking.paid',
      payload,
    }
  );

  return {
    notification: {
      // title: `Your booking #${bookingId} is completed`,
      title: `Bạn đã nhận được ${helpers.formatCurrencySSR(amount)} cho cuộc gọi ${kind} với ${userDisplayName}.`,
      body: `Gói ${helpers.formatCallDuration(duration)} - ${$start_at
        .utcOffset(await utils.getUserTimezone(advisor_id))
        .format(helpers.START_TIME_FORMAT)}`,
    },
    data: {
      type: 'advisor.booking.paid',
      purchase_id: _.get(payload, 'purchase.id'),
      service_booking_id: _.get(payload, 'purchase.service_bookings.0.id'),
    },
  };
};
