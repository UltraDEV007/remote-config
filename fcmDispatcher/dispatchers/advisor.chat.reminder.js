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
  const advisor_id = _.get(ctxData, 'advisor.id');
  const i18n = await utils.forUser(advisor_id);
  const title = i18n.t('RemoteConfig.Chat.AdvisorChatReminder.title');
  const body = i18n.t('RemoteConfig.Chat.AdvisorChatReminder.body', {
    user: _.get(ctxData, 'user.profile.display_name'),
  });

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'advisor.chat.reminder',
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

exports.effect = async ({ payload }, { ctxData, helpers, utils, clients }) => {
  const { _, moment } = helpers;
  const { hasuraClient } = clients;
  const advisor_id = _.get(ctxData, 'advisor.id');
  const i18n = await utils.forUser(advisor_id);
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
      type: 'advisor.chat.reminder',
      payload,
    }
  );

  clients.sendgridClient.getClient().sendEmail(advisor_id, {
    template: {
      name: i18n.getTemplateSuffixName('advisor.chat.reminder'),
    },
    ...i18n.getContactEmailInfo('advisor.chat.reminder'),
    ...ctxData,
    route: {
      advisor_url: clients.routeWebClient.getClient().toAdvisorUrl('home'),
      chat_url: clients.routeWebClient.getClient().toAdvisorUrl('messageWithUser', _.get(ctxData, 'user')),
    },
  });
};
