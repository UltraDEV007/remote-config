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
    statements: transaction_statement(
      where: {
        transaction_id: { _eq: $transaction_id}
      }
    ) {
      amount
      name
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

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment } = helpers;

  const advisor_id = _.get(payload, 'session.advisor_id');
  const service = _.get(payload, 'purchase.service_bookings.0');
  const $start_at = moment(_.get(service, 'start_at'));
  const duration = _.get(payload, 'session.session_duration');
  const kind = _.get(payload, 'session.kind');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');

  // query transaction info
  const statements = _.get(ctxData, 'statements');
  const amount = _.get(_.find(statements, { name: 'advisor_income' }), 'amount');
  const title = `Bạn đã nhận được ${helpers.formatCurrencySSR(amount)} cho cuộc gọi ${kind} với ${userDisplayName}.`;
  const body = `Gói ${helpers.formatCallDuration(duration)} - ${$start_at
    .utcOffset(await utils.getUserTimezone(advisor_id))
    .format(helpers.START_TIME_FORMAT)}`;
  return {
    notification: {
      // title: `Your booking #${bookingId} is completed`,
      title,
      body,
    },
    data: {
      type: 'advisor.booking.paid',
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

exports.effect = async ({ payload }, { ctxData, helpers, clients: { slackClient, hasuraClient } }) => {
  const { _ } = helpers;

  const advisor_id = _.get(payload, 'session.advisor_id');
  const userDisplayName = _.get(ctxData, 'user.profile.display_name');
  const advisorDisplayName = _.get(ctxData, 'advisor.profile.display_name');
  const duration = _.get(payload, 'session.session_duration');

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

  const statements = _.get(ctxData, 'statements');
  const advisor_income = _.get(_.find(statements, { name: 'advisor_income' }), 'amount');
  const platform_income = _.get(_.find(statements, { name: 'platform_income' }), 'amount');

  await slackClient.getClient().client.chat.postMessage({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.booking.paid',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${userDisplayName} completed booking with ${advisorDisplayName}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Duration: ${helpers.formatCallDuration(duration)} - Income: ${helpers.formatCurrencySSR(
              advisor_income
            )} / ${helpers.formatCurrencySSR(platform_income)}`,
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
    channel: 'C02HTGNDWMS',
  });
};
