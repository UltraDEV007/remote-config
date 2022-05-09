exports.getQuery = () => `
  query($user_id: String!, $advisor_id: String!, $message_id: String!) {
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
    message: message_by_pk(id: $message_id) {
      message_jsonb
      message
    }
  }
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'session.user_id'),
    advisor_id: _.get(payload, 'session.advisor_id'),
    message_id: _.get(payload, 'conversation.messages.0.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {
  const { _, moment } = helpers;
  const user_id = _.get(ctxData, 'user.id');
  const i18n = await utils.forUser(user_id);
  const title = i18n.t('RemoteConfig.Chat.UserChatReminder.title', {
    advisor: _.get(ctxData, 'advisor.profile.display_name'),
  });
  const body = i18n.t('RemoteConfig.Chat.UserChatReminder.body', {
    advisor: _.get(ctxData, 'advisor.profile.display_name'),
  });

  return {
    notification: {
      title,
      body,
    },
    data: {
      type: 'user.chat.reminder',
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
  const { _, rendererQuill } = helpers;
  const { hasuraClient } = clients;
  const user_id = _.get(ctxData, 'user.id');
  const i18n = await utils.forUser(user_id);
  const message = _.get(ctxData, 'message');
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
      type: 'user.chat.reminder',
      payload,
    }
  );

  clients.sendgridClient.getClient().sendEmail(user_id, {
    template: {
      name: i18n.getTemplateSuffixName('user.chat.reminder'),
    },
    ...i18n.getContactEmailInfo('user.chat.reminder'),
    ...ctxData,
    last_message: `<blockquote
                    style="margin: 0; background: #eee; padding: 2px 10px; border-radius: 1em"
                  >${rendererQuill.renderMessage()(message)}</blockquote>`,
    route: {
      advisor_url: clients.routeWebClient.getClient().toUserUrl('advisor', _.get(ctxData, 'advisor')),
      user_url: clients.routeWebClient.getClient().toUserUrl('profile'),
      chat_url: clients.routeWebClient.getClient().toUserUrl('messageWithAdvisor', _.get(ctxData, 'advisor')),
    },
  });
};
