exports.getQuery = () => `
  query($user_id: String!, $ticket_activity_id: uuid!) {
    user: user_by_pk(id: $user_id) {
      id
      profile {
        display_name
        phone_number
      }
    }
    activity: ticket_activity_by_pk(id: $ticket_activity_id) {
      payload
      creator {
        id
      }
    }
  } 
`;

exports.getVars = ({ payload }, { helpers: { _ } }) => {
  return {
    user_id: _.get(payload, 'ticket.user_id'),
    ticket_activity_id: _.get(payload, 'ticket_activity.id'),
  };
};

exports.dispatch = async ({ payload }, { ctxData, utils, helpers }) => {};

exports.effect = async (
  { payload },
  { ctxData, utils, helpers, clients: { slackClient, hasuraClient, routeWebClient } }
) => {
  const { _, moment } = helpers;

  const topic = _.get(ctxData, 'activity.payload.topic');

  const user = _.get(ctxData, 'user');

  const user_id = _.get(user, 'id');

  const userDisplayName = routeWebClient
    .getClient()
    .toAdminLink('admin.rcms', { ...user, ticket_id: _.get(payload, 'ticket.id') });

  const title = `${userDisplayName} đã yêu cầu khóa học *${topic}*`;
  const body = `SĐT: ${_.get(ctxData, 'activity.payload.phone')} - ${_.get(ctxData, 'activity.payload.email')}`;

  slackClient.getClient().postMessage({
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'user.RCMCourse.requested',
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
            text: body,
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
  });

  //   inapp noti effect
  // hasuraClient.getClient().request(
  //   `
  //     mutation upsertnotifevent($payload: jsonb, $type: String) {
  //       insert_notification_one(
  //         object: {
  //           owner_id: "${user_id}"
  //           type_id: $type
  //           payload: $payload
  //         }
  //       ) {
  //         id
  //       }
  //     }
  //   `,
  //   {
  //     type: 'user.RCMCourse.requested',
  //     payload,
  //   }
  // );
};
