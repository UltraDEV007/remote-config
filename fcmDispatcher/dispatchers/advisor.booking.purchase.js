exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $service_id: uuid!) {
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
      services(where: {id: {_eq: $service_id}}) {
        per_amount
        per_unit
        price_amount
        price_currency
        service {
          kind
        }
      }
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'user_id'),
    advisor_id: _.get(payload, 'advisor_id'),
    service_id: _.get(payload, 'service_bookings.data.0.service_id'),
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
  const duration = _.get(payload, 'services.data.0.per_amount');

  const userDisplayName = _.get(ctxData, 'user.profile.display_name');

  const i18n = await utils.forUser(advisor_id);

  const title = i18n.t('RemoteConfig.Call.AdvisorCallReminder.title', {
    user: userDisplayName,
  });

  const body = i18n.t('RemoteConfig.Call.Package', {
    package: helpers.formatCallDurationWithI18n(i18n)(duration),
  });

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.booking.purchase',
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
  { ctxData, helpers, utils, clients: { slackClient, hasuraClient, routeWebClient } }
) => {
  const { _ } = helpers;
  const userDisplayName = routeWebClient.getClient().toAdminLink('admin.user', _.get(ctxData, 'user'));
  const advisorDisplayName = routeWebClient.getClient().toAdminLink('admin.advisor', _.get(ctxData, 'advisor'));
  const service = _.get(ctxData, 'advisor.services.0');
  const duration = _.get(service, 'per_amount');
  const kind = _.get(service, 'service.kind');

  const statements = _.get(ctxData, 'statements');

  const title = `${userDisplayName} đã mua đặt lịch(${kind}) của ${advisorDisplayName}`;

  console.log({ title });

  await slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'advisor.booking.purchase',
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
            text: `Gói: ${kind} ${helpers.formatCallDuration(duration)}`,
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
  });
};
